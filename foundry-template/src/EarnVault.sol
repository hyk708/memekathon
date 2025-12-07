// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./LRT.sol";

/**
 * @title EarnVault
 * @notice Vault for depositing igM (Liquid Staking Token) and receiving vigM (Vault igM).
 * @dev Implements an ERC-4626-like functionality for token staking.
 * It includes a 2-block withdrawal delay mechanism for demonstration purposes.
 *
 * Security features:
 * - Virtual offset to prevent inflation attacks.
 * - Timelock for strategy changes.
 * - Reentrancy guards.
 * - 2-block withdrawal delay.
 */
contract EarnVault is Ownable, ReentrancyGuard {
    // Constants
    uint256 private constant VIRTUAL_OFFSET = 1e6; // 1 million virtual shares/assets
    uint256 public constant STRATEGY_DELAY = 2 days;
    uint256 public constant WITHDRAWAL_DELAY = 2; // 2 blocks

    // State variables
    IERC20 public immutable asset; // The underlying token asset (igM)
    LRT public immutable vigM; // The vault share token (vigM)
    address public strategy; // Strategy address for yield generation

    // Strategy timelock
    address public proposedStrategy;
    uint256 public strategyProposalTime;

    // Withdrawal requests
    struct WithdrawalRequest {
        uint256 shares;
        uint256 unlockBlock;
    }
    mapping(address => WithdrawalRequest) public withdrawalRequests;

    // Events
    event Deposit(address indexed sender, address indexed receiver, uint256 assets, uint256 shares);
    event WithdrawRequest(address indexed owner, uint256 shares, uint256 unlockBlock);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event StrategyProposed(address indexed newStrategy, uint256 executeTime);
    event StrategySet(address indexed newStrategy);
    event Harvest(address indexed caller, uint256 harvested);

    /**
     * @param _asset The address of the underlying ERC20 token (igM)
     */
    constructor(address _asset) Ownable(msg.sender) {
        require(_asset != address(0), "Zero address");
        asset = IERC20(_asset);
        vigM = new LRT("Vault igM", "vigM");
    }

    // =================================================================================
    // ERC-4626 Core Logic
    // =================================================================================

    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 totalSupply = vigM.totalSupply();
        if (totalSupply == 0) {
            return assets; // 1:1 ratio for first depositor
        }
        return (assets * (totalSupply + VIRTUAL_OFFSET)) / (totalAssets() + VIRTUAL_OFFSET);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 totalSupply = vigM.totalSupply();
        if (totalSupply == 0) {
            return 0;
        }
        return (shares * (totalAssets() + VIRTUAL_OFFSET)) / (totalSupply + VIRTUAL_OFFSET);
    }

    function deposit(uint256 assets, address receiver) public nonReentrant returns (uint256 shares) {
        require(assets > 0, "Zero deposit");
        require(receiver != address(0), "Zero address");

        shares = convertToShares(assets);
        require(shares > 0, "Zero shares");

        // Transfer assets from depositor
        asset.transferFrom(msg.sender, address(this), assets);

        // Mint vault shares to receiver
        vigM.mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function redeem(uint256 shares, address receiver, address owner) public nonReentrant returns (uint256 assets) {
        require(shares > 0, "Zero redeem");
        require(receiver != address(0), "Zero address");
        require(owner != address(0), "Zero address");
        
        // This is a direct redeem, which circumvents the withdrawal delay.
        // For the hackathon, we will enforce the delay via request/complete pattern.
        // This function is here for ERC-4626 compatibility, but will revert.
        revert("Use requestWithdrawal and completeWithdrawal");
    }

    // =================================================================================
    // Withdrawal Delay Logic
    // =================================================================================
    
    function requestWithdrawal(uint256 shares, address owner) public {
        require(shares > 0, "Zero shares");
        require(owner == msg.sender, "Not owner"); // For simplicity, only owner can request
        require(withdrawalRequests[owner].shares == 0, "Request exists");
        require(vigM.balanceOf(owner) >= shares, "Insufficient balance");

        withdrawalRequests[owner] = WithdrawalRequest({
            shares: shares,
            unlockBlock: block.number + WITHDRAWAL_DELAY
        });

        // Burn shares immediately
        vigM.burn(owner, msg.sender, shares);
        
        emit WithdrawRequest(owner, shares, block.number + WITHDRAWAL_DELAY);
    }

    function completeWithdrawal(address receiver) public nonReentrant returns (uint256 assets) {
        WithdrawalRequest storage request = withdrawalRequests[msg.sender];
        require(request.shares > 0, "No request");
        require(block.number >= request.unlockBlock, "Still locked");

        assets = convertToAssets(request.shares);
        require(assets > 0, "Zero assets");

        // Reset request
        delete withdrawalRequests[msg.sender];

        // Transfer assets to receiver
        asset.transfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, msg.sender, assets, request.shares);
    }

    // =================================================================================
    // Strategy & Harvest
    // =================================================================================

    function harvest() external {
        require(strategy != address(0), "No strategy");
        // In a real scenario, you'd call a harvest function on the strategy
        // For simulation, we assume the strategy has sent funds to this vault.
        // The value of vigM increases as totalAssets() grows relative to vigM.totalSupply().
        uint256 balanceBefore = totalAssets();
        // ISimulatedStrategy(strategy).harvest();
        uint256 balanceAfter = totalAssets();
        uint256 harvested = balanceAfter - balanceBefore;

        emit Harvest(msg.sender, harvested);
    }

    // =================================================================================
    // Admin
    // =================================================================================

    function proposeStrategy(address _strategy) external onlyOwner {
        require(_strategy != address(0), "Zero address");
        proposedStrategy = _strategy;
        strategyProposalTime = block.timestamp + STRATEGY_DELAY;
        emit StrategyProposed(_strategy, strategyProposalTime);
    }

    function executeStrategyChange() external onlyOwner {
        require(proposedStrategy != address(0), "No proposal");
        require(block.timestamp >= strategyProposalTime, "Timelock active");

        strategy = proposedStrategy;
        proposedStrategy = address(0);
        strategyProposalTime = 0;

        emit StrategySet(strategy);
    }
}
