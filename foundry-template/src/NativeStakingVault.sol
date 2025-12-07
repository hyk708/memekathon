// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "forge-std/console.sol"; // Removed for debugging
import "./LRT.sol";

/**
 * @title NativeStakingVault
 * @notice Vault for staking native $M tokens and receiving stM
 * @dev Implements ERC-4626-like functionality for native token staking
 *
 * Security features:
 * - Virtual offset to prevent inflation attack
 * - Timelock for strategy changes
 * - Daily slash limits
 * - Slippage protection
 * - Reentrancy guards
 */
contract NativeStakingVault is Ownable, ReentrancyGuard {
    // Constants
    uint256 private constant VIRTUAL_OFFSET = 1e6; // 1 million virtual shares/assets
    uint256 public constant STRATEGY_DELAY = 0;
    uint256 public constant MAX_DAILY_SLASH_PERCENT = 10; // 10% max per day

    // State variables
    LRT public immutable stM; // stM token (Staked M)
    address public strategy; // Strategy address with special privileges
    uint256 public totalNativeAssets; // Explicitly track total native M assets

    // Strategy timelock
    address public proposedStrategy;
    uint256 public strategyProposalTime;

    // Slash limits
    uint256 public lastSlashDay;
    uint256 public dailySlashed;

    // Events
    event Deposit(address indexed sender, address indexed receiver, uint256 assets, uint256 shares);
    event Withdraw(
        address indexed sender,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    event StrategyProposed(address indexed newStrategy, uint256 executeTime);
    event StrategySet(address indexed strategy);
    event Slashed(uint256 amount, uint256 remainingAssets);

    /**
     * @notice Initialize the native staking vault
     */
    constructor() Ownable(msg.sender) {
        // Deploy stM token (Staked M)
        stM = new LRT("Staked M", "stM");
        totalNativeAssets = 0; // Initialize
    }

    /**
     * @notice Deposit native $M and receive stM shares
     * @param receiver Address to receive stM shares
     * @param minSharesOut Minimum shares to receive (slippage protection)
     * @return shares Amount of stM shares minted
     */
    function deposit(address receiver, uint256 minSharesOut)
        public
        payable
        nonReentrant
        returns (uint256 shares)
    {
        require(msg.value != 0, "Zero deposit");
        require(receiver != address(0), "Zero address");

        // Calculate shares based on balance BEFORE this deposit
        uint256 assetsBefore = totalNativeAssets; // Use explicit tracker
        uint256 totalSupply = stM.totalSupply();
        shares = (msg.value * (totalSupply + VIRTUAL_OFFSET)) / (assetsBefore + VIRTUAL_OFFSET);

        require(shares >= minSharesOut, "Slippage exceeded");
        require(shares != 0, "Zero shares");

        // Mint stM shares to receiver
        stM.mint(receiver, shares);

        totalNativeAssets += msg.value; // Update explicit tracker

        emit Deposit(msg.sender, receiver, msg.value, shares);
    }

    /**
     * @notice Withdraw native $M by burning stM shares
     * @param assets Amount of $M to withdraw
     * @param receiver Address to receive $M
     * @param owner Address owning the stM shares
     * @param maxSharesIn Maximum shares to burn (slippage protection)
     * @return shares Amount of stM shares burned
     */
    function withdraw(uint256 assets, address receiver, address owner, uint256 maxSharesIn)
        public
        nonReentrant
        returns (uint256 shares)
    {
        require(assets != 0, "Zero withdraw");
        require(receiver != address(0), "Zero address");

        // Calculate shares to burn based on current exchange rate
        shares = convertToShares(assets);
        require(shares <= maxSharesIn, "Slippage exceeded");
        require(shares != 0, "Zero shares");

        // Allowance check and burn handled in LRT.burn()
        stM.burn(owner, msg.sender, shares);

        totalNativeAssets -= assets; // Update explicit tracker

        // Transfer native $M to receiver
        (bool success,) = payable(receiver).call{value: assets}("");
        require(success, "Transfer failed");

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /**
     * @notice Redeem stM shares for native $M
     * @param shares Amount of stM shares to redeem
     * @param receiver Address to receive $M
     * @param owner Address owning the stM shares
     * @param minAssetsOut Minimum assets to receive (slippage protection)
     * @return assets Amount of $M received
     */
    function redeem(uint256 shares, address receiver, address owner, uint256 minAssetsOut)
        public
        nonReentrant
        returns (uint256 assets)
    {
        require(shares != 0, "Zero redeem");
        require(receiver != address(0), "Zero address");

        // Calculate assets to withdraw based on current exchange rate
        assets = convertToAssets(shares);
        require(assets >= minAssetsOut, "Slippage exceeded");
        require(assets != 0, "Zero assets");

        // Allowance check and burn handled in LRT.burn()
        stM.burn(owner, msg.sender, shares);

        totalNativeAssets -= assets; // Update explicit tracker

        // Transfer native $M to receiver
        (bool success,) = payable(receiver).call{value: assets}("");
        require(success, "Transfer failed");

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /**
     * @notice Convert $M amount to stM shares with virtual offset
     * @dev Uses virtual shares to prevent inflation attack
     * @param assets Amount of $M
     * @return shares Equivalent amount of stM shares
     */
    function convertToShares(uint256 assets) public view returns (uint256 shares) {
        uint256 _totalAssets = totalNativeAssets; // Use explicit tracker
        uint256 totalSupply = stM.totalSupply();

        // Virtual offset prevents inflation attack
        shares = (assets * (totalSupply + VIRTUAL_OFFSET)) / (_totalAssets + VIRTUAL_OFFSET);
    }

    /**
     * @notice Convert stM shares to $M amount with virtual offset
     * @param shares Amount of stM shares
     * @return assets Equivalent amount of $M
     */
    function convertToAssets(uint256 shares) public view returns (uint256 assets) {
        uint256 _totalAssets = totalNativeAssets; // Use explicit tracker
        uint256 totalSupply = stM.totalSupply();

        if (totalSupply == 0) {
            return 0;
        }

        // Virtual offset for consistency
        assets = (shares * (_totalAssets + VIRTUAL_OFFSET)) / (totalSupply + VIRTUAL_OFFSET);
    }

    /**
     * @notice Get total $M assets held by the vault
     * @return Total native token balance
     */
    function totalAssets() public view returns (uint256) {
        return totalNativeAssets; // Return explicit tracker
    }

    /**
     * @notice Propose a new strategy address (step 1 of timelock)
     * @dev Only owner can propose
     * @param _strategy Address of the new strategy contract
     */
    function proposeStrategy(address _strategy) external onlyOwner {
        require(_strategy != address(0), "Zero address");
        proposedStrategy = _strategy;
        strategyProposalTime = block.timestamp + STRATEGY_DELAY;
        emit StrategyProposed(_strategy, strategyProposalTime);
    }

    /**
     * @notice Execute strategy change after timelock (step 2 of timelock)
     * @dev Only owner can execute after delay
     */
    function executeStrategyChange() external onlyOwner {
        require(proposedStrategy != address(0), "No proposal");
        require(block.timestamp >= strategyProposalTime, "Timelock active");

        strategy = proposedStrategy;
        proposedStrategy = address(0);
        strategyProposalTime = 0;

        emit StrategySet(strategy);
    }

    /**
     * @notice Cancel proposed strategy change
     * @dev Only owner can cancel
     */
    function cancelStrategyProposal() external onlyOwner {
        proposedStrategy = address(0);
        strategyProposalTime = 0;
    }

    /**
     * @notice Slash (burn) native $M from the vault with daily limits
     * @dev Only owner or strategy can call this
     * @dev Limited to MAX_DAILY_SLASH_PERCENT per day
     * @param amount Amount of $M to burn
     */
    function slash(uint256 amount) external {
        require(msg.sender == owner() || msg.sender == strategy, "Unauthorized");
        require(amount != 0, "Zero slash");

        // Check daily slash limit
        uint256 today = block.timestamp / 1 days;
        if (today > lastSlashDay) {
            lastSlashDay = today;
            dailySlashed = 0;
        }

        uint256 currentAssets = totalNativeAssets; // Use explicit tracker
        uint256 maxSlash = (currentAssets * MAX_DAILY_SLASH_PERCENT) / 100;
        require(dailySlashed + amount <= maxSlash, "Daily limit exceeded");

        require(currentAssets >= amount, "Insufficient balance");

        dailySlashed += amount;
        totalNativeAssets -= amount; // Update explicit tracker

        // Transfer to dead address to effectively burn
        (bool success,) = payable(address(0xdead)).call{value: amount}("");
        require(success, "Slash transfer failed");

        emit Slashed(amount, totalNativeAssets); // Emit with updated tracker
    }

    // Backwards compatibility: deposit without slippage param (uses 0 as min)
    function deposit(address receiver) external payable returns (uint256) {
        return deposit(receiver, 0);
    }

    // Backwards compatibility: withdraw without slippage param (uses type(uint256).max as max)
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256) {
        return withdraw(assets, receiver, owner, type(uint256).max);
    }

    // Backwards compatibility: redeem without slippage param (uses 0 as min)
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256) {
        return redeem(shares, receiver, owner, 0);
    }

    // Receive function to accept native token deposits
    receive() external payable {
        totalNativeAssets += msg.value; // Update explicit tracker
    }
}
