# Memekathon Implementation Action Plan

## 📋 Overview

This document outlines the complete implementation plan for the 2-Layer Liquid Staking & Restaking system on Memecore.

**Last Updated**: 2025-12-02

---

## ✅ Completed Work

### Layer 1: Native M Staking (M → igM)
- [x] NativeStakingVault.sol implemented
- [x] NativeStrategy.sol implemented (basic version)
- [x] LRT.sol (igM token) implemented
- [x] 7 tests passing (NativeStakingVault.t.sol)
- [x] Deployed to Insectarium testnet
- [x] Contracts verified on Blockscout

### Infrastructure
- [x] LRTVault.sol (for MRC-20 tokens)
- [x] MockStrategy.sol (for MRC-20 rewards)
- [x] MemeToken.sol (example token)
- [x] 7 tests passing (LRTVault.t.sol)

### Documentation
- [x] README.md updated with scope and architecture
- [x] CLAUDE.md updated with implementation roadmap
- [x] Reward mechanism documented (block-based simulation)
- [x] Scope clarified (excluded Point system, TGE, Governance)

---

## 🎯 Remaining Work

### Phase 1: Update Native Strategy ⚡ HIGH PRIORITY

**Goal**: Add block-based reward harvesting to existing Layer 1

**Tasks**:

1. **Update NativeStrategy.sol**
   - [ ] Add state variables:
     ```solidity
     uint256 public lastRewardBlock;
     uint256 public rewardPerBlock = 0.01 ether;
     ```
   - [ ] Implement `harvestRewards()` function
     ```solidity
     function harvestRewards() external {
         uint256 blocksPassed = block.number - lastRewardBlock;
         uint256 rewards = blocksPassed * rewardPerBlock;
         vault.depositRewards{value: rewards}();
         lastRewardBlock = block.number;
     }
     ```
   - [ ] Add `fundStrategy()` payable function
   - [ ] Add `setRewardPerBlock()` admin function
   - [ ] Add `pendingRewards()` view function
   - [ ] Add `receive()` external payable
   - [ ] Keep existing `adminDepositRewards()` as fallback

2. **Update Tests**
   - [ ] Add `test_HarvestRewards()` in NativeStakingVault.t.sol
   - [ ] Test block advancement with `vm.roll()`
   - [ ] Test permissionless harvesting
   - [ ] Verify exchange rate increases correctly

3. **Local Testing**
   - [ ] Run `forge test -vvv`
   - [ ] Ensure all existing tests still pass
   - [ ] Verify new reward mechanism works

**Acceptance Criteria**:
- ✅ NativeStrategy funded with test M
- ✅ harvestRewards() callable by anyone
- ✅ Exchange rate increases after harvest
- ✅ All tests pass

---

### Phase 2: Layer 2 Implementation ⚡ HIGH PRIORITY

**Goal**: Complete igM → vigM liquid restaking system

#### 2.1 Implement EarnVault.sol

**Tasks**:
- [ ] Create `src/EarnVault.sol`
- [ ] Use NativeStakingVault.sol as template
- [ ] Key changes from NativeStakingVault:
  - [ ] Change from `payable` to `IERC20 public immutable igM`
  - [ ] Constructor takes `address _igM` instead of being payable
  - [ ] Deploy vigM token: `vigM = new LRT("Vault igM", "vigM")`
  - [ ] Use `igM.transferFrom()` instead of `msg.value`
  - [ ] Implement 2-block withdrawal delay:
    ```solidity
    mapping(address => WithdrawalRequest) public withdrawalRequests;

    struct WithdrawalRequest {
        uint256 shares;
        uint256 unlockBlock;
    }

    function requestWithdrawal(uint256 shares) external
    function completeWithdrawal(address receiver, uint256 minAssetsOut) external
    ```
- [ ] Keep same virtual offset logic (1e6)
- [ ] Keep same strategy timelock (2 days)
- [ ] Add events: `WithdrawalRequested`, `WithdrawalCompleted`

**File**: `foundry-template/src/EarnVault.sol`

#### 2.2 Implement EarnStrategy.sol

**Tasks**:
- [ ] Create `src/EarnStrategy.sol`
- [ ] Use updated NativeStrategy.sol as template
- [ ] Key changes:
  - [ ] Constructor takes `address _vault` and stores `igM` reference
  - [ ] `rewardPerBlock = 0.02 ether` (higher than Layer 1)
  - [ ] `harvestRewards()` transfers igM instead of native M:
    ```solidity
    igM.transfer(address(vault), rewards);
    ```
  - [ ] `fundStrategy(uint256 amount)` for admin to fund with igM
  - [ ] Optional: `distributeMemeToken()` for airdrops
- [ ] Add view function `pendingRewards()`
- [ ] Emit events for transparency

**File**: `foundry-template/src/EarnStrategy.sol`

#### 2.3 Write Tests

**Tasks**:
- [ ] Create `test/EarnVault.t.sol`
- [ ] Test setup:
  ```solidity
  function setUp() public {
      nativeVault = new NativeStakingVault();
      igM = nativeVault.lrt();

      earnVault = new EarnVault(address(igM));
      vigM = earnVault.vigM();

      earnStrategy = new EarnStrategy(address(earnVault));
  }
  ```
- [ ] Implement tests:
  - [ ] `test_TokenNaming()` - verify vigM name/symbol
  - [ ] `test_DepositIgM()` - deposit igM, receive vigM
  - [ ] `test_RequestWithdrawal()` - request withdrawal
  - [ ] `test_CompleteWithdrawal()` - complete after 2 blocks
  - [ ] `test_CannotWithdrawEarly()` - fail before unlock
  - [ ] `test_BlockBasedRewards()` - harvest rewards, rate increases
  - [ ] `test_FullFlow()` - M → igM → vigM → igM → M
- [ ] Use `assertApproxEqAbs()` for precision tolerance

**File**: `foundry-template/test/EarnVault.t.sol`

**Acceptance Criteria**:
- ✅ All 7+ tests passing
- ✅ Withdrawal delay works (2 blocks)
- ✅ Exchange rate increases with rewards
- ✅ Full flow test completes successfully

---

### Phase 3: Protocol Token Staking 🔹 MEDIUM PRIORITY

**Goal**: Enable IG token staking for ecosystem participation

#### 3.1 Deploy IG Token

**Tasks**:
- [ ] Option A: Reuse MemeToken.sol
  ```solidity
  MemeToken ig = new MemeToken(100_000_000 ether);
  ```
- [ ] Option B: Create dedicated `IG.sol` with custom features
- [ ] Recommended name: "iggnorance Protocol Token"
- [ ] Symbol: "IG"
- [ ] Initial supply: 100,000,000 IG

**Decision**: Use Option A (simpler, sufficient for hackathon)

#### 3.2 Deploy IG Staking Vault

**Tasks**:
- [ ] Reuse existing `LRTVault.sol` (already tested)
- [ ] Deploy: `new LRTVault(address(igToken))`
- [ ] Auto-creates stIG token
- [ ] No code changes needed ✅

#### 3.3 Deploy IG Strategy

**Tasks**:
- [ ] Reuse existing `MockStrategy.sol`
- [ ] Deploy: `new MockStrategy(address(igVault))`
- [ ] Admin can deposit IG rewards manually
- [ ] Optional: Upgrade to block-based rewards later

**Acceptance Criteria**:
- ✅ IG token deployed
- ✅ IG vault deployed
- ✅ stIG token created
- ✅ IG strategy deployed
- ✅ Can stake IG → receive stIG

---

### Phase 4: Complete System Deployment ⚡ HIGH PRIORITY

**Goal**: Deploy all contracts to Insectarium testnet

#### 4.1 Update Deployment Script

**Tasks**:
- [ ] Update `script/DeployQuick.s.sol`
- [ ] Structure:
  ```solidity
  // Part 1: Native M Staking (existing) ✅
  NativeStakingVault nativeVault = new NativeStakingVault();
  NativeStrategy nativeStrategy = new NativeStrategy(...);

  // Part 2: Earn Vault (NEW)
  EarnVault earnVault = new EarnVault(address(nativeVault.lrt()));
  EarnStrategy earnStrategy = new EarnStrategy(address(earnVault));

  // Part 3: IG Token Staking (NEW)
  MemeToken igToken = new MemeToken(100_000_000 ether);
  LRTVault igVault = new LRTVault(address(igToken));
  MockStrategy igStrategy = new MockStrategy(address(igVault));

  // Part 4: Setup (NEW)
  nativeStrategy.fundStrategy{value: 10 ether}();
  // Transfer igM to earnStrategy and fund
  ```
- [ ] Add console logs for all addresses
- [ ] Add summary section at end

**File**: `foundry-template/script/DeployQuick.s.sol`

#### 4.2 Deploy to Testnet

**Commands**:
```bash
cd foundry-template

# Test deployment locally first
forge script script/DeployQuick.s.sol

# Deploy to Insectarium
forge script script/DeployQuick.s.sol \
  --priority-gas-price 1000000000 \
  --rpc-url insectarium \
  --broadcast \
  --verify
```

**Tasks**:
- [ ] Run local simulation
- [ ] Deploy to testnet
- [ ] Verify all contracts on Blockscout
- [ ] Save all contract addresses

#### 4.3 Post-Deployment Setup

**Tasks**:
- [ ] Fund NativeStrategy with M (done in deployment)
- [ ] Get igM from NativeVault:
  ```bash
  cast send <NATIVE_VAULT> "deposit(address,uint256)" <YOUR_ADDRESS> 0 \
    --value 1ether \
    --private-key $PRIVATE_KEY \
    --rpc-url insectarium
  ```
- [ ] Approve and fund EarnStrategy with igM
- [ ] Test `harvestRewards()` on both layers
- [ ] Verify exchange rates increase

**Acceptance Criteria**:
- ✅ All contracts deployed and verified
- ✅ Strategies funded
- ✅ harvestRewards() works on both layers
- ✅ Exchange rates increase correctly

---

### Phase 5: Frontend Implementation 🔹 MEDIUM PRIORITY

**Goal**: Build user-facing dApp with Privy integration

#### 5.1 Project Setup

**Tasks**:
- [ ] Initialize Next.js project:
  ```bash
  npx create-next-app@latest frontend
  cd frontend
  npm install @privy-io/react-auth wagmi viem
  ```
- [ ] Configure Privy:
  - [ ] Get Privy App ID from dashboard
  - [ ] Add Memecore Insectarium to supported chains
- [ ] Create `lib/contracts.ts` with ABIs and addresses
- [ ] Set up wallet connection

**Directory**: `memekathon/frontend/`

#### 5.2 Core Pages

**Tasks**:

**Main Page** (`/`):
- [ ] Logo (Memecore 'c' → 'ig')
- [ ] Navigation: Stake, Earn, Docs
- [ ] Privy Connect button
- [ ] Quick stake interface:
  - [ ] M input field
  - [ ] igM output preview
  - [ ] "Stake" button

**Stake Page** (`/stake`):
- [ ] Two tabs: "Stake M" / "Unstake igM"
- [ ] Stake M tab:
  - [ ] M balance display
  - [ ] M input field
  - [ ] igM output preview (use `convertToShares()`)
  - [ ] "Stake" button
- [ ] Unstake igM tab:
  - [ ] igM balance display
  - [ ] igM input field
  - [ ] M output preview (use `convertToAssets()`)
  - [ ] "Unstake in ~2 blocks" message
  - [ ] "Request Unstake" button
  - [ ] "Complete Unstake" button (enabled after unlock)
  - [ ] Show current unstake request status

**Earn Page** (`/earn`):
- [ ] Two tabs: "Deposit igM" / "Withdraw vigM"
- [ ] Deposit igM tab:
  - [ ] igM balance display
  - [ ] igM input field
  - [ ] vigM output preview
  - [ ] "Deposit" button
- [ ] Withdraw vigM tab:
  - [ ] vigM balance display
  - [ ] vigM input field
  - [ ] igM output preview
  - [ ] "Withdrawal in ~2 blocks" message
  - [ ] "Request Withdrawal" button
  - [ ] "Complete Withdrawal" button (enabled after unlock)
  - [ ] Show withdrawal request status

#### 5.3 UI Components

**Tasks**:
- [ ] WalletConnect component (Privy)
- [ ] TokenBalance component
- [ ] ExchangeRate display
- [ ] TransactionStatus notifications (toast)
- [ ] UnstakeRequestTracker component
- [ ] WithdrawalRequestTracker component

#### 5.4 Contract Interactions

**Tasks**:
- [ ] Use wagmi hooks for contract calls:
  - [ ] `useContractRead` for balances/rates
  - [ ] `useContractWrite` for deposits/withdrawals
  - [ ] `useWaitForTransaction` for confirmations
- [ ] Handle transaction states (pending, success, error)
- [ ] Add error handling and user feedback

**Acceptance Criteria**:
- ✅ Wallet connection works
- ✅ Can stake M → receive igM
- ✅ Can unstake igM → receive M (after 2 blocks)
- ✅ Can deposit igM → receive vigM
- ✅ Can withdraw vigM → receive igM (after 2 blocks)
- ✅ All balances and rates display correctly
- ✅ Transaction feedback works

---

## 📊 Progress Tracking

### Current Status
- **Overall Progress**: ~40% complete
- **Smart Contracts**: ~50% complete (Layer 1 done, Layer 2 pending)
- **Tests**: ~40% complete (Layer 1 done, Layer 2 pending)
- **Deployment**: ~33% complete (Layer 1 done, Layer 2 pending)
- **Frontend**: 0% complete

### Priority Order
1. **Phase 1** (Update Native Strategy) - Can be done quickly
2. **Phase 2** (Layer 2 Implementation) - Core feature, must complete
3. **Phase 4** (Deployment) - After Phase 2
4. **Phase 3** (IG Token) - Can be done in parallel
5. **Phase 5** (Frontend) - After deployment

---

## 🚀 Quick Start Guide

### For Immediate Development

```bash
# 1. Navigate to contracts
cd /home/islab/memekathon/foundry-template

# 2. Start with Phase 1 (Update NativeStrategy)
# Edit: src/NativeStrategy.sol
# Add: harvestRewards(), fundStrategy(), etc.

# 3. Test changes
forge test -vvv

# 4. Move to Phase 2 (Create EarnVault)
# Create: src/EarnVault.sol
# Create: src/EarnStrategy.sol
# Create: test/EarnVault.t.sol

# 5. Test Layer 2
forge test --match-contract EarnVault -vvv

# 6. Update deployment script
# Edit: script/DeployQuick.s.sol

# 7. Deploy everything
forge script script/DeployQuick.s.sol \
  --rpc-url insectarium \
  --broadcast \
  --verify
```

---

## 📝 Notes

### Decisions Made
- ✅ Using block-based reward simulation (not real PoM validators)
- ✅ 2-block unstaking delay (instead of 8.5 days)
- ✅ Excluding Point system, TGE, Governance
- ✅ Reusing LRTVault for IG token staking
- ✅ Permissionless reward harvesting

### Risks & Mitigations
- **Risk**: Layer 2 complexity
  - **Mitigation**: Reuse Layer 1 patterns, thorough testing
- **Risk**: Frontend integration
  - **Mitigation**: Use proven libraries (Privy, wagmi)
- **Risk**: Testnet instability
  - **Mitigation**: Comprehensive local testing first

### Success Criteria
- ✅ All smart contracts deployed and verified
- ✅ All tests passing (14+ tests total)
- ✅ Working frontend demo
- ✅ Can perform full flow: M → igM → vigM → igM → M
- ✅ Block-based rewards work on both layers
- ✅ Unstaking/withdrawal delays work correctly

---

## 🔗 Resources

### Documentation
- [README.md](../README.md) - Project overview
- [CLAUDE.md](./CLAUDE.md) - Implementation guide
- [memecore.md](./memecore.md) - Memecore protocol docs
- [Memekathon v0.1.pdf](./Memekathon%20v0.1.pdf) - Hackathon requirements

### Deployed Contracts (Layer 1)
- NativeStakingVault: `0xf9fA3d43496f64A2A034D6CE5FA2cb4FD795A197`
- igM Token: `0x70aDa11511BA9fa96A7c41CC99EaEB28e881E224`
- NativeStrategy: `0x4221E0C679588B70B633CC85c4deC95E4Fc14f1a`

### Network Info
- RPC: `https://rpc.insectarium.memecore.net`
- Chain ID: `43522`
- Explorer: `https://insectarium.blockscout.memecore.com`

---

**Last Updated**: 2025-12-02
**Next Action**: Begin Phase 1 (Update NativeStrategy.sol)
