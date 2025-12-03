// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./NativeStakingVault.sol";

/**
 * @title NativeStrategy
 * @notice Strategy for managing native $M staking rewards and slashing
 * @dev Only owner can simulate rewards and slashing events
 */
contract NativeStrategy is Ownable {
    NativeStakingVault public immutable vault;

    event RewardsDeposited(uint256 amount, uint256 newTotalAssets);
    event Slashed(uint256 amount, uint256 newTotalAssets);

    /**
     * @notice Initialize the strategy with vault reference
     * @param _vault Address of the NativeStakingVault
     */
    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "Zero address");
        vault = NativeStakingVault(payable(_vault));
    }

    /**
     * @notice Simulate external rewards (from PoM, validators, etc.)
     * @dev Deposits native $M to the vault to increase exchange rate
     */
    function adminDepositRewards() external payable onlyOwner {
        require(msg.value != 0, "Zero reward");

        // Transfer native $M to vault
        (bool success,) = payable(address(vault)).call{value: msg.value}("");
        require(success, "Reward transfer failed");

        emit RewardsDeposited(msg.value, vault.totalAssets());
    }

    /**
     * @notice Simulate slashing event
     * @dev Burns native $M from the vault to decrease exchange rate
     * @param lossAmount Amount of $M to slash
     */
    function adminSimulateSlash(uint256 lossAmount) external onlyOwner {
        require(lossAmount != 0, "Zero slash");
        require(vault.totalAssets() >= lossAmount, "Insufficient balance");

        // Call vault's slash function to burn tokens
        vault.slash(lossAmount);

        uint256 newTotalAssets = vault.totalAssets();

        emit Slashed(lossAmount, newTotalAssets);
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
