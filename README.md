# memekathon
# MVP 구현

---

- react + nextjs

- scope
    - 목표: PoM 스테이킹 유동성 확보, 추가 수익 통합 및 위험 감수 메커니즘 시연
    - 온체인 연동을 Mock 함수로 대체해서 일단 구현, 추후 보강
- 스마트 컨트랙트

| 컨트랙트명 | 역할 | 표준 및 특징 |
| --- | --- | --- |
| LRTVault.sol | $M 예치, LRT 발행/소각 관리, 프로토콜의 핵심 자산 볼트 역할 | ERC-4626 (Vault), Ownable |
| LRT.sol | 유동성 리스테이킹 토큰. LRTVault와 연동 | ERC-20 |
| MockStrategy.sol | 보상 수집 및 슬래싱 시뮬레이션 | Ownable, LRTVault 접근 권한 |
1. `LRT.sol` (liquid restaking token)
    1. ERC-20
    2. `LRTVault.sol` 과의 관계를 통해 발행/소각 권한을 제한
2. `LRTVault.sol` (core deposit & vault)
    1. $M 보관, LRT의 교환 비율 관리
    2. `constructor(address _memeToken)`
        1. $M 주소 설정, `LRT.sol` 배포 및 연동
        2. Deployer
    3. `deposit(uint256 assets, address receiver) returns (uint256 shares)` 
        1. $M을 받고, 현재 교환 비율에 따라 LRT를 발행하여 `shares` 반환
        2. Public
    4. `withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)` 
        1. LRT의 `shares` 를 소각하고, 현재 교환 비율에 따라 $M을 돌려줌 (언바운딩 기간 없이 즉시 인출)
        2. Public
    5. `convertToShares(uint256 assets)` 
        1. $M 수량에 따른 LRT 수량을 계산 (교환 비율 확인용)
        2. Public/View
3. `MockStrategy.sol` (Simulation Layer)
    1. `adminDepositRewards(uint256 rewardAmount)` 
        1. 보상 시뮬레이션
        2. 외부 보상(PoM, Meme Vault)이 들어온 것 처럼 $M을 LRTVault에 입금하여 교환 비율 상승
        3. Owner/Admin
    2. `adminSimulateSlash(uint256 lossAmount)` 
        1. 슬래싱 시뮬레이션
        2. 리스테이킹 활동에서 슬래싱이 발생한 것 처럼 LRTVault의 $M을 `lossAmount` 만큼 소각하여 교환 비율 하락
        3. Owner/Admin
- FE
    - 예치 UI, UX
    - 인출 UI, UX
    - KPI
        - 사용자의 $M 잔액
        - 사용자의 LRT 잔액
        - 현재 교환 비율 (1 LRT = ? $M)
- testcase
    1. 초기 상태 확인
        1. `LRTVault` 배포 후 1 $M 당 1 LRT의 교환 비율로 시작하는지 확인
    2. 정상 예치 및 인출
        1. 사용자가 $M을 예치했을 때 LRT를 받는지 확인
        2. 인출 시 $M을 돌려받고 LRT가 소각되는지 확인 
    3. 보상 시뮬레이션
        1. 사용자 예치 후 `adminDepositRewards()` 를 통해 보상 입금
        2. 교환비가 상승하는지 확인
    4. 슬래싱 시뮬레이션
        1. 보상으로 교환 비율이 상승한 상태에서 `adminSimulateSlash()` 를 통해 자산 손실 시뮬레이션
        2. 교환비가 이전보다 하락하는지 확인
    5. 보상 후 인출 검증
        1. 보상이 누적된 상태에서 LRT를 인출했을 때 예치한 $M보다 더 돌려받는지 확인