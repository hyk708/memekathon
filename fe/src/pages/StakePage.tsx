import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { NativeStakingVaultABI } from '../abis/NativeStakingVault';
import { IERC20ABI } from '../abis/IERC20';
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
    abi: IERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Get expected igM output for stake
  const { data: expectedIgm } = useReadContract({
    address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
    abi: NativeStakingVaultABI,
    functionName: 'convertToShares',
    args: stakeAmount ? [parseEther(stakeAmount)] : undefined,
  });

  // Get expected M output for unstake
  const { data: expectedM } = useReadContract({
    address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
    abi: NativeStakingVaultABI,
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
    if (isDepositSuccess) {
      refetchMBalance();
      refetchIgmBalance();
      setStakeAmount(''); // Clear input
    }
  }, [isDepositSuccess, refetchMBalance, refetchIgmBalance]);

  useEffect(() => {
    if (isWithdrawSuccess) {
      refetchMBalance();
      refetchIgmBalance();
      setUnstakeAmount(''); // Clear input
    }
  }, [isWithdrawSuccess, refetchMBalance, refetchIgmBalance]);

  const handleStake = async () => {
    if (!address || !stakeAmount) return;

    try {
      deposit({
        address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
        abi: NativeStakingVaultABI,
        functionName: 'deposit',
        args: [address, 0n], // receiver, minSharesOut (0 for now)
        value: parseEther(stakeAmount),
      });
    } catch (error) {
      console.error('Stake failed:', error);
    }
  };

  const handleUnstake = async () => {
    if (!address || !unstakeAmount) return;

    try {
      withdraw({
        address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
        abi: NativeStakingVaultABI,
        functionName: 'withdraw',
        args: [
          parseEther(unstakeAmount), // assets
          address, // receiver
          address, // owner
          parseEther(unstakeAmount), // maxSharesIn (use same amount for simplicity)
        ],
      });
    } catch (error) {
      console.error('Unstake failed:', error);
    }
  };

  return (
    <center>
      <br />
      <table cellPadding={10}>
        <tbody>
          <tr>
            <td>
              <button onClick={() => setActiveTab('stake')} disabled={activeTab === 'stake'}>
                Stake M
              </button>
            </td>
            <td>
              <button onClick={() => setActiveTab('unstake')} disabled={activeTab === 'unstake'}>
                Unstake igM
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {activeTab === 'stake' ? (
        <fieldset style={{ width: '500px', padding: '30px', marginTop: '20px' }}>
          <legend></legend>

          <table width="100%" cellPadding={10}>
            <tbody>
              <tr>
                <td>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0"
                    size={25}
                  />
                  <br />
                  <small>$0</small>
                </td>
                <td align="right">
                  <span><strong>M</strong></span>
                  <br />
                  <small>{mBalance ? formatBalance(formatUnits(mBalance.value, 18)) : '0.00'} M</small>
                </td>
              </tr>
              <tr>
                <td colSpan={2}><hr /></td>
              </tr>
              <tr>
                <td>
                  <strong>Stake</strong>
                  <br />
                  <big>{expectedIgm ? formatBalance(formatUnits(expectedIgm as bigint, 18)) : '0.00'}</big>
                  <br />
                  <small>$0</small>
                </td>
                <td align="right">
                  <span><strong>igM</strong></span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <button onClick={handleStake} disabled={!address || !stakeAmount || isDepositPending} style={{ width: '100%', padding: '10px' }}>
                    {isDepositPending ? 'Staking...' : 'Stake'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </fieldset>
      ) : (
        <fieldset style={{ width: '500px', padding: '30px', marginTop: '20px' }}>
          <legend></legend>

          <table width="100%" cellPadding={10}>
            <tbody>
              <tr>
                <td>
                  <input
                    type="number"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    placeholder="0"
                    size={25}
                  />
                  <br />
                  <small>$0</small>
                </td>
                <td align="right">
                  <span><strong>igM</strong></span>
                  <br />
                  <small>{igmBalance ? formatBalance(formatUnits(igmBalance as bigint, 18)) : '0.00'} igM</small>
                </td>
              </tr>
              <tr>
                <td colSpan={2}><hr /></td>
              </tr>
              <tr>
                <td>
                  <strong>Unstake in ~2 blocks</strong>
                  <br />
                  <big>{expectedM ? formatBalance(formatUnits(expectedM as bigint, 18)) : '0.00'}</big>
                  <br />
                  <small>$0</small>
                </td>
                <td align="right">
                  <span><strong>M</strong></span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <button onClick={handleUnstake} disabled={!address || !unstakeAmount || isWithdrawPending} style={{ width: '100%', padding: '10px' }}>
                    {isWithdrawPending ? 'Unstaking...' : 'Unstake'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </fieldset>
      )}
    </center>
  );
}
