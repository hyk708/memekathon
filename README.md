# Memecore 2-Layer Liquid Staking & Restaking Protocol

## 1. 프로젝트 개요

본 프로젝트는 Memecore 네트워크의 네이티브 토큰 `M`을 위한 **2-Layer 유동성 스테이킹 및 리스테이킹(Restaking) 프로토콜**입니다.

- **Layer 1**에서는 `M` 토큰을 유동화하여 `igM` (LST)을 발행하고, PoM 스테이킹 보상을 얻을 수 있습니다.
- **Layer 2**에서는 발행된 `igM`을 다시 예치(Re-stake)하여 더 높은 추가 수익을 창출하는 `vigM` (LRT)을 받습니다.

이를 통해 사용자는 스테이킹 자산의 유동성을 확보하는 동시에, 자산 활용을 극대화하여 추가 수익을 얻을 수 있습니다.

## 2. 아키텍처

본 프로토콜은 두 개의 레이어로 구성되어, 사용자의 위험 선호도에 따라 다양한 수익 전략을 제공합니다.

### Layer 1: Liquid Staking (M → igM)

- **컨트랙트**: `NativeStakingVault.sol`
- **역할**: 사용자가 네이티브 토큰 `M`을 스테이킹하면, 그에 상응하는 **유동성 스테이킹 토큰(LST)인 `igM`**을 발행합니다.
- **수익**: `igM` 보유자는 Memecore PoM 프로토콜의 기본적인 스테이킹 보상을 받게 되며, 이는 `igM`의 가치 상승으로 반영됩니다.

```
M (Native Token)  ---[Stake]-->  NativeStakingVault  -->  igM (Liquid Staking Token)
```

### Layer 2: Liquid Restaking (igM → vigM)

- **컨트랙트**: `EarnVault.sol`
- **역할**: 사용자는 Layer 1에서 얻은 `igM` 토큰을 `EarnVault`에 다시 예치하여, **유동성 리스테이킹 토큰(LRT)인 `vigM`**을 발행받습니다.
- **수익**: `EarnVault`는 다양한 추가 수익 전략(`EarnStrategy`)을 통해 `igM`보다 더 높은 수익을 창출하도록 설계되었습니다. 이는 `vigM`의 가치 상승으로 반영됩니다.

```
igM (LST)  ---[Deposit]-->  EarnVault  -->  vigM (Liquid Restaking Token)
```

## 3. 주요 기능

- **Native Token Liquid Staking**: `M` 토큰을 `igM`으로 변환하여 유동성을 유지하며 스테이킹 보상 획득.
- **Liquid Restaking**: `igM`을 `vigM`으로 다시 예치하여 추가 수익 극대화.
- **시뮬레이션 기반 보상**: `NativeStrategy`와 `EarnStrategy`를 통해 블록 생성에 따른 보상 분배를 시뮬레이션.
- **2-Block 출금 지연**: `EarnVault`의 안정성을 위해 2블록의 출금 지연 메커니즘 구현.
- **모듈식 설계**: 각 컨트랙트가 명확한 역할을 가지고 있어 확장 및 유지보수가 용이합니다.

## 4. 컨트랙트 목록

- **NativeStakingVault.sol**: Layer 1의 핵심 컨트랙트. `M` ↔ `igM` 스테이킹/언스테이킹 처리.
- **NativeStrategy.sol**: `NativeStakingVault`의 보상 및 슬래싱 시뮬레이션.
- **EarnVault.sol**: Layer 2의 핵심 컨트랙트. `igM` ↔ `vigM` 예치/인출 처리.
- **EarnStrategy.sol**: `EarnVault`의 추가 수익 생성을 시뮬레이션.
- **LRT.sol**: `igM`, `vigM` 등 유동화 토큰의 기반이 되는 ERC-20 컨트랙트.
- **기타**: `LRTVault`, `MemeToken` 등 MRC-20 토큰 스테이킹을 위한 컨트랙트 포함.

## 5. 배포된 컨트랙트 주소 (Insectarium Testnet)

### Layer 1: Native Staking
- **NativeStakingVault**: `0x18D9E3A8237E80D349B554467F2f45C55bf72c84`
- **igM Token (LRT)**: `0x0E263e14314d60e670020FfADadFfE09F6D21001`
- **NativeStrategy**: `0xC449f63e65b50dB6fA58c325ACc2fE5e8d1870A1`

### Layer 2: Earn Vault
- **EarnVault**: `0x561FE24176b91A2c35c9b1D7154Ae7154F4F97eB`
- **vigM Token (LRT)**: `0x83e43C4297E09A81CeEB658Eb91e07091d3f8071`
- **EarnStrategy**: `0xa4FBe3A80cE3fF8B7169C88740156D904833892b`

### MRC-20 Staking (Example)
- **MemeToken (KG)**: `0xefB70811a45fFe3eD7798E421C5f8AFB0E223B30`
- **LRTVault (for KG)**: `0xbb7BB7A825279b417a1faD7DB5c549ACa4c47003`
- **stKG Token (LRT)**: `0xe3536Db41b3EB8afbF6BCe8cc73B45F192E55bA1`
- **MockStrategy**: `0xf8a21CAD0B627cdadB76edEA4db8018F9Ba12023`
