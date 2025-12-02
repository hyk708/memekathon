# Memekathon - Liquid Staking & Restaking on Memecore

## 프로젝트 개요

Memecore 블록체인에서 작동하는 2-Layer Liquid Staking 및 Restaking 시스템 구현

- **목표**: PoM(Proof of Meme) 스테이킹 유동성 확보, 추가 수익 통합 및 위험 감수 메커니즘 시연
- **기술 스택**: React + Next.js (Frontend), Solidity + Foundry (Smart Contracts)
- **네트워크**: Memecore Insectarium Testnet (Chain ID: 43522)

### 구현 범위 (Hackathon Scope)

**✅ 구현할 것:**
- Layer 1: Native M Staking (M → igM) - 1% PoM reserve
- Layer 2: Liquid Restaking (igM → vigM) - 4% PoM reserve
- MRC-20 Token Staking (IG → stIG) - 프로토콜 토큰 스테이킹
- 블록 기반 보상 시뮬레이션
- 2-block unstaking delay (데모용)

**❌ 제외할 것:**
- Point System (실사용자 수 불확실)
- Point → Token 변환 (TGE)
- Governance 기능
- 실제 Memecore PoM validator 연동 (TBA)

**🎯 핵심 가치 제안:**
```
Conservative: M → igM (안정적 수익)
Aggressive:   M → igM → vigM (높은 수익)
Ecosystem:    IG Token Staking (프로토콜 참여)
```

---

## 아키텍처

### 2-Layer 시스템

```
Layer 1 (Stake) - LST (Liquid Staking Token)
  M (Native) → NativeStakingVault → igM

Layer 2 (Earn) - LRT (Liquid Restaking Token)
  igM → EarnVault → vigM
```

**토큰 설명:**
- **M**: Memecore 네이티브 토큰
- **igM**: ig Memecore (Liquid Staking Token) - M을 스테이킹하면 받는 토큰
- **vigM**: Vault igM (Liquid Restaking Token) - igM을 예치하면 받는 토큰

---

## 스마트 컨트랙트

### Layer 1: Liquid Staking (M → igM)

| 컨트랙트명 | 역할 | 표준 및 특징 |
| --- | --- | --- |
| NativeStakingVault.sol | 네이티브 M 스테이킹 볼트, igM 발행/소각 관리 (1% reserve) | ERC-4626-like, Ownable, ReentrancyGuard |
| LRT.sol (igM) | Liquid Staking Token (igM) | ERC-20, Mintable/Burnable |
| NativeStrategy.sol | PoM 보상 수집 및 슬래싱 시뮬레이션 | Ownable |

#### 1. `NativeStakingVault.sol`
- **역할**: 네이티브 M 토큰을 받아 igM을 발행, PoM 1% reserve 관리
- **주요 함수**:
  - `deposit(address receiver, uint256 minSharesOut) payable returns (uint256 shares)`
    - 네이티브 M을 받고 igM 발행
    - Slippage protection (minSharesOut)
  - `withdraw(uint256 assets, address receiver, address owner, uint256 maxSharesIn) returns (uint256 shares)`
    - igM을 소각하고 M 반환
    - **2 blocks unstaking delay** (해커톤용)
  - `redeem(uint256 shares, address receiver, address owner, uint256 minAssetsOut) returns (uint256 assets)`
    - igM 수량 기준으로 M 반환
  - `convertToShares(uint256 assets)` / `convertToAssets(uint256 shares)`
    - M ↔ igM 교환 비율 계산
- **보안 기능**:
  - Virtual offset (1e6) - inflation attack 방지
  - Strategy 변경 timelock (2 days)
  - Daily slash limit (10% max)
  - Reentrancy guard

#### 2. `LRT.sol` (igM 토큰)
- **역할**: ERC-20 Liquid Staking Token
- **특징**:
  - NativeStakingVault만 mint/burn 권한 보유
  - 동적 이름 생성 ("Staked M" → "igM")

#### 3. `NativeStrategy.sol`
- **역할**: PoM 보상 및 슬래싱 시뮬레이션
- **주요 함수**:
  - `adminDepositRewards() payable`
    - PoM 보상을 Vault에 입금하여 igM 가치 상승
  - `adminSimulateSlash(uint256 amount)`
    - 슬래싱 시뮬레이션으로 igM 가치 하락
  - `getExchangeRate() returns (uint256)`
    - 현재 1 igM = ? M 비율 조회

---

### Layer 2: Liquid Restaking (igM → vigM)

| 컨트랙트명 | 역할 | 표준 및 특징 |
| --- | --- | --- |
| EarnVault.sol | igM 예치 볼트, vigM 발행/소각 관리 | ERC-4626-like, Ownable, ReentrancyGuard |
| LRT.sol (vigM) | Liquid Restaking Token (vigM) | ERC-20, Mintable/Burnable |
| EarnStrategy.sol | 추가 수익 전략 시뮬레이션 | Ownable |

#### 1. `EarnVault.sol` (구현 예정)
- **역할**: igM을 받아 vigM을 발행, 추가 수익 전략 실행
- **주요 함수**:
  - `deposit(uint256 assets, address receiver, uint256 minSharesOut) returns (uint256 shares)`
    - igM을 받고 vigM 발행
  - `withdraw(uint256 assets, address receiver, address owner, uint256 maxSharesIn) returns (uint256 shares)`
    - vigM을 소각하고 igM 반환
    - **2 blocks withdrawal delay** (해커톤용)
  - `redeem(uint256 shares, address receiver, address owner, uint256 minAssetsOut) returns (uint256 assets)`
    - vigM 수량 기준으로 igM 반환
- **보안 기능**:
  - Virtual offset
  - Strategy timelock
  - Reentrancy guard

#### 2. `EarnStrategy.sol` (구현 예정)
- **역할**: vigM 보유자에게 추가 수익 제공
- **수익 원천**:
  - Meme Vault 운영 수수료
  - Point 시스템 보상
  - 기타 DeFi 프로토콜 연동

---

## 프론트엔드 요구사항

### 필수 페이지 (Privy 연동)

#### 1. Main Page
- **기능**: M → igM 스테이킹 (기본 페이지)
- **UI 요소**:
  - 로고 (밈코어 로고 'c' → 'ig'로 변경)
  - 네비게이션: Stake, Earn, Point, Docs
  - Connect 버튼 (Privy 연동)
  - 토큰 선택 드롭다운 (M 선택)
  - 입력 금액 + 사용자 보유 금액 표시
  - Stake → 받을 igM 수량 표시
  - Stake 버튼

#### 2. Stake Page
- **기능**: M ↔ igM Stake/Unstake
- **UI 요소**:
  - 2개 탭: "Stake M" / "Unstake igM"
  - **Stake M 탭**:
    - M 입력 필드 (사용자 보유 M 표시)
    - igM 출력 필드 (예상 수령량)
    - Stake 버튼
  - **Unstake igM 탭**:
    - igM 입력 필드 (사용자 보유 igM 표시)
    - M 출력 필드 (예상 수령량)
    - "Unstake in ~2 blocks" 안내 문구
    - Unstake 버튼

#### 3. Earn Page
- **기능**: igM ↔ vigM Deposit/Withdrawal
- **UI 요소**:
  - 2개 탭: "Deposit igM" / "Withdrawal vigM"
  - **Deposit igM 탭**:
    - igM 입력 필드 (사용자 보유 igM 표시)
    - vigM 출력 필드 (예상 수령량)
    - Deposit 버튼
  - **Withdrawal vigM 탭**:
    - vigM 입력 필드 (사용자 보유 vigM 표시)
    - igM 출력 필드 (예상 수령량)
    - "Withdrawal in ~2 blocks" 안내 문구
    - Withdrawal 버튼

### 선택 페이지 (시간 남으면)
- **Point Page**: Point 시스템 현황 및 히스토리
- **Docs Page**: 프로토콜 문서 및 가이드

### KPI 표시
- 사용자의 M 잔액
- 사용자의 igM 잔액
- 사용자의 vigM 잔액
- 현재 교환 비율:
  - 1 igM = ? M
  - 1 vigM = ? igM

---

## 보상 메커니즘 (Reward Mechanism)

### 개요

Memecore PoM 프로토콜에서는 두 가지 주요 수익 원천이 있습니다:

**실제 Memecore Mainnet:**
1. **MRC-20 Reserve (5%)**
   - 모든 새 MRC-20 토큰 발행 시 총 공급량의 5% 자동 예약
   - 1% → $M Stakers (igM 보유자)
   - 4% → Meme Stakers (vigM 보유자)
   - 1,000일에 걸쳐 vesting

2. **Validator Block Rewards**
   - 블록 생성 시마다 $M 토큰 발행
   - 75% → $M Stakers
   - 25% → Meme Stakers

3. **Viral Grants Reserve**
   - PoM 보상의 10%가 Viral Grants Reserve로
   - 조건 충족 시 Meme Vault에 분배

### Shares-based 보상 시스템

우리 프로토콜은 **ERC-4626 스타일의 Shares-based 시스템**을 사용합니다. (Lido, Rocketpool과 동일)

```solidity
// 작동 원리:
1. User deposits 1000 M → receives 1000 igM (shares)
2. Rewards added to vault → totalAssets increases
3. Exchange rate increases: 1 igM = 1.1 M
4. User withdraws 1000 igM → receives 1100 M (profit!)

// Exchange rate 계산
exchangeRate = totalAssets / totalSupply
```

**핵심:** Shares(igM) 수량은 변하지 않고, Assets(M) 수량만 증가하여 exchange rate 자동 상승

### Testnet/Hackathon 구현: 블록 기반 시뮬레이션

**현재 상태:**
- Memecore PoM validator 기능이 아직 완전히 구현되지 않음 (TBA 상태)
- Insectarium Testnet에서 실제 validator rewards 연동 불가능

**우리의 솔루션:** 블록 기반 자동 보상 시뮬레이션

```solidity
contract NativeStrategy {
    uint256 public rewardPerBlock = 0.01 ether; // 블록당 0.01 M
    uint256 public lastRewardBlock;

    // 누구나 호출 가능 (Permissionless)
    function harvestRewards() external {
        uint256 blocksPassed = block.number - lastRewardBlock;
        uint256 rewards = blocksPassed * rewardPerBlock;

        vault.depositRewards{value: rewards}();
        lastRewardBlock = block.number;
    }
}
```

**작동 방식:**
1. Admin이 Strategy contract에 M 충전
2. 블록이 지남 (Memecore block time: 7초)
3. 누구나 `harvestRewards()` 호출 가능
4. 경과한 블록 수 × rewardPerBlock 만큼 보상 분배
5. igM/vigM exchange rate 자동 상승

**예시:**
```
Block 1000: User stakes 1000 M → receives 1000 igM
Block 1100: harvestRewards() called
  → 100 blocks × 0.01 M = 1 M rewards distributed
  → Exchange rate: 1 igM = 1.001 M
Block 1200: harvestRewards() called again
  → 100 blocks × 0.01 M = 1 M more rewards
  → Exchange rate: 1 igM = 1.002 M
User withdraws: 1000 igM → receives 1002 M (2 M profit!)
```

### Layer별 보상 구조

#### Layer 1 (igM) - NativeStrategy

```
수익 원천 (Mainnet):
- 1% MRC-20 Reserve
- 75% Validator block rewards
- PoM staking rewards

시뮬레이션 (Testnet):
- rewardPerBlock: 0.01 M (조절 가능)
- Block-based automatic distribution
- Permissionless harvesting
```

#### Layer 2 (vigM) - EarnStrategy

```
수익 원천 (Mainnet):
- 4% MRC-20 Reserve (igM의 4배!)
- 25% Validator block rewards
- Viral Grants Reserve (10% of PoM rewards)
- Meme Vault operation fees

시뮬레이션 (Testnet):
- rewardPerBlock: 0.02 igM (igM보다 높음)
- MRC-20 token airdrops (수동)
- Block-based automatic distribution
```

### Mainnet 전환 전략

**현재 (Testnet):**
```solidity
function harvestRewards() external {
    uint256 rewards = blocksPassed * rewardPerBlock;
    vault.depositRewards{value: rewards}();
}
```

**나중 (Mainnet):**
```solidity
function harvestRewards() external {
    // Memecore validator contract 연동
    IValidatorRewards validator = IValidatorRewards(VALIDATOR_ADDRESS);
    uint256 rewards = validator.claimRewards();
    vault.depositRewards{value: rewards}();
}
```

### 장점

1. ✅ **실제 블록 기반** - "진짜" 프로토콜 느낌
2. ✅ **Permissionless** - 누구나 harvest 호출 가능 (탈중앙화)
3. ✅ **조절 가능** - rewardPerBlock 조정으로 데모 최적화
4. ✅ **Mainnet 전환 쉬움** - 함수 하나만 바꾸면 됨
5. ✅ **자동 분배** - Exchange rate 자동 업데이트
6. ✅ **표준 방식** - Lido, Rocketpool과 동일한 메커니즘

---

## Unstaking/Withdrawal 메커니즘

**해커톤용 설정: 2 blocks 딜레이**

```solidity
// 기존 8.5일 대신 2블록 사용 (데모용)
uint256 public constant UNSTAKE_DELAY = 2; // 2 blocks

struct UnstakeRequest {
    uint256 shares;
    uint256 unlockBlock;  // block.number + 2
}

function requestUnstake(uint256 shares) public {
    // unstake 요청 생성
    unstakeRequests[msg.sender] = UnstakeRequest({
        shares: shares,
        unlockBlock: block.number + UNSTAKE_DELAY
    });
}

function completeUnstake() public {
    require(block.number >= unstakeRequests[msg.sender].unlockBlock, "Still locked");
    // unstake 실행
}
```

**장점**:
- ✅ Timelock 메커니즘 시연 가능
- ✅ 데모 중 빠른 테스트 (수 초 ~ 수십 초)
- ✅ 실제 작동 확인 가능

---

## 테스트 시나리오

### Layer 1 (M → igM) 테스트
1. **초기 상태 확인**
   - NativeStakingVault 배포 후 1:1 교환 비율 확인
2. **정상 Stake/Unstake**
   - M을 stake하여 igM 받기
   - igM을 unstake하여 M 돌려받기 (2블록 후)
3. **보상 시뮬레이션**
   - NativeStrategy를 통해 보상 입금
   - igM 가치 상승 확인 (1 igM > 1 M)
4. **슬래싱 시뮬레이션**
   - 슬래싱 발생 시뮬레이션
   - igM 가치 하락 확인
5. **보상 후 Unstake 검증**
   - 보상 누적 상태에서 unstake 시 이득 확인

### Layer 2 (igM → vigM) 테스트
1. **초기 상태 확인**
   - EarnVault 배포 후 1:1 교환 비율 확인
2. **정상 Deposit/Withdrawal**
   - igM을 deposit하여 vigM 받기
   - vigM을 withdraw하여 igM 돌려받기 (2블록 후)
3. **추가 수익 시뮬레이션**
   - EarnStrategy를 통해 수익 입금
   - vigM 가치 상승 확인 (1 vigM > 1 igM)
4. **복합 시나리오**
   - M → igM → vigM 전체 플로우 테스트
   - 각 레이어에서 보상 누적 후 최종 수익 확인

---

## 배포된 컨트랙트 (Insectarium Testnet)

### Native Staking (1% reserve)
- **NativeStakingVault**: `0xf9fA3d43496f64A2A034D6CE5FA2cb4FD795A197`
- **igM Token**: `0x70aDa11511BA9fa96A7c41CC99EaEB28e881E224`
- **NativeStrategy**: `0x4221E0C679588B70B633CC85c4deC95E4Fc14f1a`

### MRC-20 Staking (4% reserve) - 기존 구현
- **iggnoyk (KG)**: `0x2F57C4ABe475F0120DCB08AFEB3E116BB8000F40`
- **LRTVault**: `0x2C400FA1935fB12e94c6CBa612aB046DaA6268E4`
- **stKG Token**: `0xb478C48e3584eEA680e6f933730D3b051813d8dB`
- **MockStrategy**: `0xFa397A1878188c7Cb05a3379567Ff4CC99CFfC46`

### Earn Vault (구현 예정)
- **EarnVault**: TBD
- **vigM Token**: TBD
- **EarnStrategy**: TBD

---

## 개발 환경 설정

```bash
# 프로젝트 클론
cd foundry-template

# 의존성 설치
forge install

# 컴파일
forge build

# 테스트
forge test

# 테스트 (상세 로그)
forge test -vvv

# 배포 (Insectarium Testnet)
forge script script/DeployQuick.s.sol \
  --priority-gas-price 1000000000 \
  --rpc-url insectarium \
  --broadcast \
  --verify
```

---

## Point 시스템 (추후 구현)

- LRT(igM, vigM) 보유자에게 Point 지급
- Point 기반 거버넌스 및 추가 혜택
- 추후 MRC-20 발행 시 Point → Token 전환 가능

---

## 참고 문서

- [PoM.md](./PoM.md) - Proof of Meme 합의 알고리즘 설명
- [Memekathon v0.1.pdf](./files/Memekathon%20v0.1.pdf) - 해커톤 요구사항
- [Memecore Docs](https://docs.memecore.com)
