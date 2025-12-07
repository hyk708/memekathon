// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
// import "forge-std/console.sol"; // Removed for debugging
import "./NativeStakingVault.sol";

/**
 * @title NativeStrategy
 * @notice Strategy for managing native $M staking rewards
 * @dev Implements a permissionless, block-based reward simulation.
 */
contract NativeStrategy is Ownable {
    NativeStakingVault public immutable vault;

    uint256 public rewardPerBlock;
    uint256 public lastRewardBlock;

    event RewardsHarvested(address indexed harvester, uint256 rewards);
    event RewardRateChanged(uint256 newRate);
    event RewardsDeposited(address indexed depositor, uint256 amount);

    /**
     * @notice Initialize the strategy with vault reference
     * @param _vault Address of the NativeStakingVault
     */
    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "Zero address");
        vault = NativeStakingVault(payable(_vault));
        lastRewardBlock = block.number;
    }

    /**
     * @notice Harvests pending rewards and sends them to the vault.
     * @dev This can be called by anyone. It calculates rewards based on blocks passed
     * and transfers them from this contract's balance to the vault.
     */
    function harvest() external {
        uint256 blocksPassed = block.number - lastRewardBlock;
        if (blocksPassed == 0) {
            return; // No rewards to harvest
        }

        uint256 rewards = blocksPassed * rewardPerBlock;
        uint256 contractBalance = address(this).balance;

        if (rewards > contractBalance) {
            rewards = contractBalance; // Only harvest what is available
        }
        
        if (rewards == 0) {
            return; // No rewards to harvest
        }

        lastRewardBlock = block.number;
        
        // Transfer native M rewards to the vault to increase its totalAssets
        (bool success,) = payable(address(vault)).call{value: rewards}("");
        require(success, "Reward transfer failed");

        emit RewardsHarvested(msg.sender, rewards);
    }

    /**
     * @notice Sets the reward rate per block.
     * @param _rewardPerBlock The new reward rate.
     */
    function setRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        rewardPerBlock = _rewardPerBlock;
        emit RewardRateChanged(_rewardPerBlock);
    }

    /**
     * @notice Allows the owner to deposit native M rewards into the strategy.
     */
    function depositRewards() external payable onlyOwner {
        require(msg.value > 0, "Zero deposit");
        emit RewardsDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Get current exchange rate (1 stM = ? $M)
     * @return Exchange rate with 18 decimals precision
     */
    function getExchangeRate() external view returns (uint256) {
        uint256 totalSupply = vault.stM().totalSupply();
        if (totalSupply == 0) {
            return 1e18; // 1:1 ratio initially
        }

        uint256 totalAssets = vault.totalAssets();
        // Exchange rate = totalAssets / totalSupply (in 18 decimals)
        return (totalAssets * 1e18) / totalSupply;
    }

    // Receive function to accept native token
    receive() external payable {}
}
