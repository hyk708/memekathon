// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LRTVault.sol";

/**
 * @title MockStrategy
 * @notice Simulation layer for testing rewards and slashing without real blockchain integration
 * @dev Only owner can simulate rewards and slashing events
 */
contract MockStrategy is Ownable {
    using SafeERC20 for IERC20;

    LRTVault public immutable vault;
    IERC20 public immutable memeToken;

    event RewardsDeposited(uint256 amount, uint256 newTotalAssets);
    event Slashed(uint256 amount, uint256 newTotalAssets);

    /**
     * @notice Initialize the strategy with vault reference
     * @param _vault Address of the LRTVault
     */
    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "Zero address");
        vault = LRTVault(_vault);
        memeToken = IERC20(vault.asset());
    }

    /**
     * @notice Simulate external rewards (from PoM, Meme Vault, etc.)
     * @dev Deposits meme tokens to the vault to increase exchange rate
     * @param rewardAmount Amount of meme tokens to deposit as rewards
     */
    function adminDepositRewards(uint256 rewardAmount) external onlyOwner {
        require(rewardAmount != 0, "Zero reward");

        // Transfer meme tokens from owner to this contract, then to vault
        memeToken.safeTransferFrom(msg.sender, address(vault), rewardAmount);

        emit RewardsDeposited(rewardAmount, vault.totalAssets());
    }

    /**
     * @notice Simulate slashing event
     * @dev Burns meme tokens from the vault to decrease exchange rate
     * @param lossAmount Amount of meme tokens to slash
     */
    function adminSimulateSlash(uint256 lossAmount) external onlyOwner {
        require(lossAmount != 0, "Zero slash");
        require(memeToken.balanceOf(address(vault)) >= lossAmount, "Insufficient balance");

        // Call vault's slash function to burn tokens
        vault.slash(lossAmount);

        uint256 newTotalAssets = vault.totalAssets();

        emit Slashed(lossAmount, newTotalAssets);
    }

    /**
     * @notice Get current exchange rate (1 LRT = ? meme tokens)
     * @return Exchange rate with 18 decimals precision
     */
    function getExchangeRate() external view returns (uint256) {
        uint256 totalSupply = vault.lrt().totalSupply();
        if (totalSupply == 0) {
            return 1e18; // 1:1 ratio initially
        }

        uint256 totalAssets = vault.totalAssets();
        // Exchange rate = totalAssets / totalSupply (in 18 decimals)
        return (totalAssets * 1e18) / totalSupply;
    }
}
