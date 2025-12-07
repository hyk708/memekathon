// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./EarnVault.sol";

/**
 * @title EarnStrategy
 * @notice Simulates yield generation for the EarnVault.
 * @dev This strategy simulates rewards in the form of `rewardToken` (igM)
 * based on the number of blocks that have passed since the last harvest.
 * It is a permissionless system for demonstration purposes.
 */
contract EarnStrategy is Ownable {
    // State variables
    address public immutable vault;
    IERC20 public immutable rewardToken; // This should be igM

    uint256 public rewardPerBlock;
    uint256 public lastRewardBlock;

    // Events
    event Harvest(address indexed harvester, uint256 rewards);
    event RewardRateChanged(uint256 newRate);
    event RewardsDeposited(address indexed depositor, uint256 amount);

    /**
     * @param _vault The address of the EarnVault.
     * @param _rewardToken The address of the reward token (igM).
     */
    constructor(address _vault, address _rewardToken) Ownable(msg.sender) {
        require(_vault != address(0), "Zero vault address");
        require(_rewardToken != address(0), "Zero reward token address");
        
        vault = _vault;
        rewardToken = IERC20(_rewardToken);
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
        uint256 contractBalance = rewardToken.balanceOf(address(this));

        if (rewards > contractBalance) {
            rewards = contractBalance; // Only harvest what is available
        }
        
        if (rewards == 0) {
            return; // No rewards to harvest
        }

        lastRewardBlock = block.number;
        
        // Transfer rewards to the vault to increase its totalAssets
        rewardToken.transfer(vault, rewards);

        emit Harvest(msg.sender, rewards);
    }

    // =================================================================================
    // Admin Functions
    // =================================================================================

    /**
     * @notice Sets the reward rate per block.
     * @param _rewardPerBlock The new reward rate.
     */
    function setRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        rewardPerBlock = _rewardPerBlock;
        emit RewardRateChanged(_rewardPerBlock);
    }

    /**
     * @notice Allows the owner to deposit reward tokens into the strategy.
     * @param amount The amount of reward tokens to deposit.
     */
    function depositRewards(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero deposit");
        rewardToken.transferFrom(msg.sender, address(this), amount);
        emit RewardsDeposited(msg.sender, amount);
    }
}
