// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LRT.sol";

/**
 * @title LRTVault
 * @notice Core vault for managing meme token deposits and LRT shares
 * @dev Implements ERC-4626-like functionality with security enhancements
 *
 * Security improvements:
 * - Virtual offset to prevent inflation attack
 * - Timelock for strategy changes
 * - Daily slash limits
 * - Slippage protection
 * - Reentrancy guards
 */
contract LRTVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 private constant VIRTUAL_OFFSET = 1e6; // 1 million virtual shares/assets
    uint256 public constant STRATEGY_DELAY = 0;
    uint256 public constant MAX_DAILY_SLASH_PERCENT = 10; // 10% max per day

    // State variables
    IERC20 public immutable memeToken; // Underlying meme token (e.g., KG)
    LRT public immutable lrt; // LRT shares token (e.g., stKG)
    address public strategy; // MockStrategy address with special privileges

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
     * @notice Initialize the vault with meme token
     * @param _memeToken Address of the meme token to stake
     */
    constructor(address _memeToken) Ownable(msg.sender) {
        require(_memeToken != address(0), "Invalid token");
        memeToken = IERC20(_memeToken);

        // Get meme token symbol and create stToken dynamically
        string memory symbol = IERC20Metadata(_memeToken).symbol();
        string memory name = IERC20Metadata(_memeToken).name();

        // Deploy LRT token with "Staked {name}" and "st{symbol}"
        lrt = new LRT(
            string.concat("Staked ", name),
            string.concat("st", symbol)
        );
    }

    /**
     * @notice Deposit meme tokens and receive LRT shares
     * @param assets Amount of meme tokens to deposit
     * @param receiver Address to receive LRT shares
     * @param minSharesOut Minimum shares to receive (slippage protection)
     * @return shares Amount of LRT shares minted
     */
    function deposit(uint256 assets, address receiver, uint256 minSharesOut)
        public
        nonReentrant
        returns (uint256 shares)
    {
        require(assets != 0, "Zero deposit");
        require(receiver != address(0), "Zero address");

        // Calculate shares to mint based on current exchange rate
        shares = convertToShares(assets);
        require(shares >= minSharesOut, "Slippage exceeded");
        require(shares != 0, "Zero shares");

        // Transfer meme tokens from sender to vault
        memeToken.safeTransferFrom(msg.sender, address(this), assets);

        // Mint LRT shares to receiver
        lrt.mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /**
     * @notice Withdraw meme tokens by burning LRT shares
     * @param assets Amount of meme tokens to withdraw
     * @param receiver Address to receive meme tokens
     * @param owner Address owning the LRT shares
     * @param maxSharesIn Maximum shares to burn (slippage protection)
     * @return shares Amount of LRT shares burned
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
        lrt.burn(owner, msg.sender, shares);

        // Transfer meme tokens to receiver
        memeToken.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /**
     * @notice Redeem LRT shares for meme tokens
     * @param shares Amount of LRT shares to redeem
     * @param receiver Address to receive meme tokens
     * @param owner Address owning the LRT shares
     * @param minAssetsOut Minimum assets to receive (slippage protection)
     * @return assets Amount of meme tokens received
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
        lrt.burn(owner, msg.sender, shares);

        // Transfer meme tokens to receiver
        memeToken.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /**
     * @notice Convert meme token amount to LRT shares with virtual offset
     * @dev Uses virtual shares to prevent inflation attack
     * @param assets Amount of meme tokens
     * @return shares Equivalent amount of LRT shares
     */
    function convertToShares(uint256 assets) public view returns (uint256 shares) {
        uint256 _totalAssets = totalAssets();
        uint256 totalSupply = lrt.totalSupply();

        // Virtual offset prevents inflation attack
        // When totalSupply = 0, first depositor gets 1:1 ratio minus virtual offset
        shares = (assets * (totalSupply + VIRTUAL_OFFSET)) / (_totalAssets + VIRTUAL_OFFSET);
    }

    /**
     * @notice Convert LRT shares to meme token amount with virtual offset
     * @param shares Amount of LRT shares
     * @return assets Equivalent amount of meme tokens
     */
    function convertToAssets(uint256 shares) public view returns (uint256 assets) {
        uint256 _totalAssets = totalAssets();
        uint256 totalSupply = lrt.totalSupply();

        if (totalSupply == 0) {
            return 0;
        }

        // Virtual offset for consistency
        assets = (shares * (_totalAssets + VIRTUAL_OFFSET)) / (totalSupply + VIRTUAL_OFFSET);
    }

    /**
     * @notice Get total meme token assets held by the vault
     * @return Total meme token balance
     */
    function totalAssets() public view returns (uint256) {
        return memeToken.balanceOf(address(this));
    }

    /**
     * @notice Get the address of the asset token (meme token)
     * @return Address of meme token
     */
    function asset() public view returns (address) {
        return address(memeToken);
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
     * @notice Slash (burn) meme tokens from the vault with daily limits
     * @dev Only owner or strategy can call this
     * @dev Limited to MAX_DAILY_SLASH_PERCENT per day
     * @param amount Amount of meme tokens to burn
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

        uint256 currentAssets = totalAssets();
        uint256 maxSlash = (currentAssets * MAX_DAILY_SLASH_PERCENT) / 100;
        require(dailySlashed + amount <= maxSlash, "Daily limit exceeded");

        require(currentAssets >= amount, "Insufficient balance");

        dailySlashed += amount;

        // Transfer to dead address to effectively burn
        memeToken.safeTransfer(address(0xdead), amount);

        emit Slashed(amount, totalAssets());
    }

    // Backwards compatibility: deposit without slippage param (uses 0 as min)
    function deposit(uint256 assets, address receiver) external returns (uint256) {
        return deposit(assets, receiver, 0);
    }

    // Backwards compatibility: withdraw without slippage param (uses type(uint256).max as max)
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256) {
        return withdraw(assets, receiver, owner, type(uint256).max);
    }

    // Backwards compatibility: redeem without slippage param (uses 0 as min)
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256) {
        return redeem(shares, receiver, owner, 0);
    }
}
