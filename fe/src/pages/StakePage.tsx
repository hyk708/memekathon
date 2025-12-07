import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { nativeStakingVaultAbi } from '../abis/NativeStakingVault';
import { erc20Abi } from 'viem';
import { NATIVE_STAKING_VAULT_ADDRESS, IGM_TOKEN_ADDRESS } from '../constants/contractAddresses';
import { formatBalance } from '../utils/formatBalance';

export function StakePage() {
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  const { wallets } = useWallets();
  const wallet = wallets.length > 0 ? wallets[0] : null;
  const address = wallet?.address as `0x${string}` | undefined;

  // Get M balance (native token)
  const { data: mBalance, refetch: refetchMBalance } = useBalance({
    address,
    chainId: 43522,
  });

  // Get igM balance
  const { data: igmBalance, refetch: refetchIgmBalance } = useReadContract({
    address: IGM_TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Get expected igM output for stake
  const { data: expectedIgm } = useReadContract({
    address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
    abi: nativeStakingVaultAbi,
    functionName: 'convertToShares',
    args: stakeAmount ? [parseEther(stakeAmount)] : undefined,
  });

  // Get expected M output for unstake
  const { data: expectedM } = useReadContract({
    address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
    abi: nativeStakingVaultAbi,
    functionName: 'convertToAssets',
    args: unstakeAmount ? [parseEther(unstakeAmount)] : undefined,
  });

  // Deposit transaction
  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { isLoading: isDepositPending, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Withdraw transaction
  const { writeContract: withdraw, data: withdrawHash } = useWriteContract();
  const { isLoading: isWithdrawPending, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  // Refetch balances after successful transactions
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      refetchMBalance();
      refetchIgmBalance();
      setStakeAmount('');
      setUnstakeAmount('');
    }
  }, [isDepositSuccess, isWithdrawSuccess, refetchMBalance, refetchIgmBalance]);

  const handleStake = async () => {
    if (!address || !stakeAmount) return;
    deposit({
      address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
      abi: nativeStakingVaultAbi,
      functionName: 'deposit',
      args: [address, 0n],
      value: parseEther(stakeAmount),
    });
  };

  const handleUnstake = async () => {
    if (!address || !unstakeAmount) return;
    // This assumes the user has approved the vault to spend their igM.
    // A real app would need an approval flow here for the `redeem` function.
    withdraw({
      address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
      abi: nativeStakingVaultAbi,
      functionName: 'redeem',
      args: [parseEther(unstakeAmount), address, address, 0n],
    });
  };

  return (
    <div className="card">
      <div className="tab-buttons">
        <button onClick={() => setActiveTab('stake')} className={`tab-btn ${activeTab === 'stake' ? 'active' : ''}`}>
          Stake M
        </button>
        <button onClick={() => setActiveTab('unstake')} className={`tab-btn ${activeTab === 'unstake' ? 'active' : ''}`}>
          Unstake igM
        </button>
      </div>

      {activeTab === 'stake' ? (
        <div>
          <h2>Stake M, receive igM</h2>
          <div className="input-group">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0.0"
            />
            <div className="token-info">
              <span>M</span>
              <small>Balance: {mBalance ? formatBalance(formatUnits(mBalance.value, 18)) : '0.00'}</small>
            </div>
          </div>
          <div className="output-group">
            <span>You will receive ~</span>
            <span>{expectedIgm ? formatBalance(formatUnits(expectedIgm as bigint, 18)) : '0.00'} igM</span>
          </div>
          <button onClick={handleStake} disabled={!address || !stakeAmount || isDepositPending} className="btn">
            {isDepositPending ? 'Staking...' : 'Stake'}
          </button>
        </div>
      ) : (
        <div>
          <h2>Unstake igM, receive M</h2>
          <div className="input-group">
            <input
              type="number"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="0.0"
            />
             <div className="token-info">
              <span>igM</span>
              <small>Balance: {igmBalance ? formatBalance(formatUnits(igmBalance as bigint, 18)) : '0.00'}</small>
            </div>
          </div>
          <div className="output-group">
            <span>You will receive ~</span>
            <span>{expectedM ? formatBalance(formatUnits(expectedM as bigint, 18)) : '0.00'} M</span>
          </div>
          <button onClick={handleUnstake} disabled={!address || !unstakeAmount || isWithdrawPending} className="btn">
            {isWithdrawPending ? 'Unstaking...' : 'Unstake'}
          </button>
          <small className="info-text">Unstaking might have a delay.</small>
        </div>
      )}
    </div>
  );
}
