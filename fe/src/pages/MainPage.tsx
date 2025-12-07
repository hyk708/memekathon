import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { nativeStakingVaultAbi } from '../abis/NativeStakingVault';
import { erc20Abi } from 'viem';
import { NATIVE_STAKING_VAULT_ADDRESS, IGM_TOKEN_ADDRESS } from '../constants/contractAddresses';
import { formatBalance } from '../utils/formatBalance';

export function MainPage() {
  const [amount, setAmount] = useState('');

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

  // Get expected igM output
  const { data: expectedIgm } = useReadContract({
    address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
    abi: nativeStakingVaultAbi,
    functionName: 'convertToShares',
    args: amount ? [parseEther(amount)] : undefined,
  });

  // Deposit transaction
  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { isLoading: isDepositPending, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Refetch balances after successful transaction
  useEffect(() => {
    if (isDepositSuccess) {
      refetchMBalance();
      refetchIgmBalance();
      setAmount(''); // Clear input
    }
  }, [isDepositSuccess, refetchMBalance, refetchIgmBalance]);

  const handleStake = async () => {
    if (!address || !amount) return;
    deposit({
      address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
      abi: nativeStakingVaultAbi,
      functionName: 'deposit',
      args: [address, 0n],
      value: parseEther(amount),
    });
  };

  return (
    <div className="card">
      <h2>Liquid Staking on Memecore</h2>
      <div className="input-group">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
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
      <button onClick={handleStake} disabled={!address || !amount || isDepositPending} className="btn">
        {isDepositPending ? 'Staking...' : 'Stake'}
      </button>
    </div>
  );
}
