// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {NativeStakingVault} from "../src/NativeStakingVault.sol";
import {NativeStrategy} from "../src/NativeStrategy.sol";
import {LRT} from "../src/LRT.sol";

/**
 * @title NativeStakingVaultTest
 * @notice Test suite for native $M → stM staking
 */
contract NativeStakingVaultTest is Test {
    NativeStakingVault public vault;
    NativeStrategy public strategy;
    LRT public stM;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    function setUp() public {
        // Deploy NativeStakingVault
        vault = new NativeStakingVault();

        // Get stM token reference
        stM = vault.stM();

        // Verify token names
        assertEq(stM.symbol(), "stM", "Should be stM");
        assertEq(stM.name(), "Staked M", "Should be Staked M");

        // Deploy NativeStrategy
        strategy = new NativeStrategy(address(vault));

        // Set strategy (with timelock)
        vault.proposeStrategy(address(strategy));
        vm.warp(block.timestamp + vault.STRATEGY_DELAY());
        vault.executeStrategyChange();

        // Give test users native $M tokens
        vm.deal(user1, 10_000 ether);
        vm.deal(user2, 10_000 ether);
        vm.deal(address(this), 10_000 ether);
    }

    /**
     * Test 1: Verify token names
     */
    function test_TokenNames() public view {
        assertEq(stM.symbol(), "stM");
        assertEq(stM.name(), "Staked M");
        console.log("Test PASSED: stM token created");
    }

    /**
     * Test 2: Deposit native $M and receive stM
     */
    function test_DepositNativeM() public {
        uint256 depositAmount = 1000 ether;

        vm.prank(user1);
        uint256 shares = vault.deposit{value: depositAmount}(user1, 0);

        assertApproxEqAbs(shares, depositAmount, 1e19, "Should receive ~1:1 stM");
        assertEq(stM.balanceOf(user1), shares, "User should have stM");
        console.log("Deposited 1000 $M -> received %s stM", shares / 1e18);
    }

    /**
     * Test 3: Withdraw native $M by burning stM
     */
    function test_WithdrawNativeM() public {
        uint256 depositAmount = 1000 ether;

        // Deposit first
        vm.prank(user1);
        vault.deposit{value: depositAmount}(user1, 0);

        // Withdraw
        uint256 withdrawAmount = 500 ether;
        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        vault.withdraw(withdrawAmount, user1, user1);

        assertEq(user1.balance, balanceBefore + withdrawAmount, "Should receive $M back");
        console.log("Test PASSED: Withdraw works");
    }

    /**
     * Test 4: Rewards increase stM value
     */
    function test_RewardsIncreaseValue() public {
        uint256 depositAmount = 1000 ether;

        // User deposits
        vm.prank(user1);
        vault.deposit{value: depositAmount}(user1, 0);

        // Add rewards
        vm.prank(owner); // Prank owner to call owner-only functions
        strategy.setRewardPerBlock(0.01 ether); // Set a reward rate
        strategy.depositRewards{value: 100 ether}(); // Fund the strategy
        vm.roll(block.number + 10000); // Advance blocks to simulate rewards (10000 blocks * 0.01 ether/block = 100 ether rewards)
        strategy.harvest(); // Harvest rewards
        
        uint256 actualTotalAssets = vault.totalNativeAssets();
        uint256 totalSupply = vault.stM().totalSupply();
        uint256 actualRate = (actualTotalAssets * 1e18) / totalSupply;
        
        assertGt(actualRate, 1e18, "Exchange rate should be > 1");
        console.log("Exchange rate after rewards:", actualRate / 1e18);
    }

    /**
     * Test 5: Multiple users share rewards proportionally
     */
    function test_ProportionalRewards() public {
        // User1 deposits 600 $M
        vm.prank(user1);
        vault.deposit{value: 600 ether}(user1, 0);

        // User2 deposits 400 $M
        vm.prank(user2);
        vault.deposit{value: 400 ether}(user2, 0);

        // Add 100 $M rewards
        vm.prank(owner);
        strategy.setRewardPerBlock(0.01 ether); // Set a reward rate
        strategy.depositRewards{value: 100 ether}(); // Fund the strategy
        vm.roll(block.number + 10000); // Advance blocks to simulate rewards (10000 blocks * 0.01 ether/block = 100 ether rewards)
        strategy.harvest(); // Harvest rewards

        // Users redeem all
        uint256 user1Shares = stM.balanceOf(user1);
        vm.startPrank(user1);
        uint256 user1Assets = vault.redeem(user1Shares, user1, user1);
        vm.stopPrank();

        uint256 user2Shares = stM.balanceOf(user2);
        vm.startPrank(user2);
        uint256 user2Assets = vault.redeem(user2Shares, user2, user2);
        vm.stopPrank();

        // Check if rewards are proportional
        assertApproxEqAbs(user1Assets, 660 ether, 1e18, "User1 should have ~660 M (600 + 60)");
        assertApproxEqAbs(user2Assets, 440 ether, 1e18, "User2 should have ~440 M (400 + 40)");

        console.log("Test PASSED: Proportional rewards work");
    }
}
