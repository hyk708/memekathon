// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EarnVault.sol";
import "../src/EarnStrategy.sol";

/**
 * @title DeployEarnVault
 * @notice Deployment script for EarnVault (igM → vigM)
 * @dev Deploys EarnVault with existing igM token
 */
contract DeployEarnVaultScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // igM token address (already deployed from NativeStakingVault)
        address igMTokenAddress = 0x70aDa11511BA9fa96A7c41CC99EaEB28e881E224;

        vm.startBroadcast(deployerPrivateKey);

        console.log("\n=== Deploying EarnVault (igM -> vigM) ===\n");

        // Deploy EarnVault
        console.log(">> Deploying EarnVault");
        EarnVault earnVault = new EarnVault(igMTokenAddress);
        console.log("EarnVault deployed at:", address(earnVault));
        console.log("vigM token deployed at:", address(earnVault.vigM()));
        console.log("Underlying asset (igM):", address(earnVault.asset()));

        // Deploy EarnStrategy for EarnVault
        console.log("\n>> Deploying EarnStrategy");
        EarnStrategy earnStrategy = new EarnStrategy(address(earnVault), igMTokenAddress);
        console.log("EarnStrategy deployed at:", address(earnStrategy));

        // Propose strategy
        earnVault.proposeStrategy(address(earnStrategy));
        console.log("Strategy proposed (execute after 2 days)!\n");

        vm.stopBroadcast();

        // Summary
        console.log("=== Deployment Complete ===\n");
        console.log(">> EarnVault (Layer 2 Restaking):");
        console.log("   EarnVault:", address(earnVault));
        console.log("   vigM Token:", address(earnVault.vigM()));
        console.log("   igM Token:", igMTokenAddress);
        console.log("   EarnMockStrategy:", address(earnStrategy));
        console.log("");
        console.log("Deployer:", msg.sender);
        console.log("\n>> Usage:");
        console.log("   1. Approve igM to EarnVault");
        console.log("   2. Deposit igM -> receive vigM");
        console.log("   3. Withdraw vigM -> receive igM");
        console.log("   4. Use EarnMockStrategy.adminDepositRewards() to simulate yields");
        console.log("\n>> Next Steps:");
        console.log("   - Wait 2 days and execute: earnVault.executeStrategyChange()");
        console.log("   - Or skip timelock for testing by setting strategy directly");
    }
}
