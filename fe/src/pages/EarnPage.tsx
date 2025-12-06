import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { IERC20ABI } from '../abis/IERC20';
import { EarnVaultABI } from '../abis/EarnVault';
import { IGM_TOKEN_ADDRESS, EARN_VAULT_ADDRESS, VIGM_TOKEN_ADDRESS } from '../constants/contractAddresses';
import { formatBalance } from '../utils/formatBalance';

export function EarnPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');

  const { wallets } = useWallets();
  const wallet = wallets.length > 0 ? wallets[0] : null;
  const address = wallet?.address as `0x${string}` | undefined;

  // Get igM balance
  const { data: igmBalance, refetch: refetchIgmBalance } = useReadContract({
    address: IGM_TOKEN_ADDRESS as `0x${string}`,
    abi: IERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Get vigM balance
  const { data: vigmBalance, refetch: refetchVigmBalance } = useReadContract({
    address: VIGM_TOKEN_ADDRESS as `0x${string}`,
    abi: IERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Get expected vigM output for deposit
  const { data: expectedVigm } = useReadContract({
    address: EARN_VAULT_ADDRESS as `0x${string}`,
    abi: EarnVaultABI,
    functionName: 'convertToShares',
    args: depositAmount ? [parseEther(depositAmount)] : undefined,
  });

  // Get expected igM output for withdrawal
  const { data: expectedIgm } = useReadContract({
    address: EARN_VAULT_ADDRESS as `0x${string}`,
    abi: EarnVaultABI,
    functionName: 'convertToAssets',
    args: withdrawalAmount ? [parseEther(withdrawalAmount)] : undefined,
  });

  // Check igM allowance
  const { data: igmAllowance } = useReadContract({
    address: IGM_TOKEN_ADDRESS as `0x${string}`,
    abi: IERC20ABI,
    functionName: 'allowance',
    args: address ? [address, EARN_VAULT_ADDRESS as `0x${string}`] : undefined,
  });

  // Approve transaction
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
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
      refetchIgmBalance();
      refetchVigmBalance();
      setDepositAmount('');
    }
  }, [isDepositSuccess, refetchIgmBalance, refetchVigmBalance]);

  useEffect(() => {
    if (isWithdrawSuccess) {
      refetchIgmBalance();
      refetchVigmBalance();
      setWithdrawalAmount('');
    }
  }, [isWithdrawSuccess, refetchIgmBalance, refetchVigmBalance]);

  const handleApprove = async () => {
    if (!address || !depositAmount) return;

    try {
      approve({
        address: IGM_TOKEN_ADDRESS as `0x${string}`,
        abi: IERC20ABI,
        functionName: 'approve',
        args: [EARN_VAULT_ADDRESS as `0x${string}`, parseEther(depositAmount)],
      });
    } catch (error) {
      console.error('Approve failed:', error);
    }
  };

  const handleDeposit = async () => {
    if (!address || !depositAmount) return;

    try {
      deposit({
        address: EARN_VAULT_ADDRESS as `0x${string}`,
        abi: EarnVaultABI,
        functionName: 'deposit',
        args: [parseEther(depositAmount), address, 0n], // assets, receiver, minSharesOut
      });
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!address || !withdrawalAmount) return;

    try {
      withdraw({
        address: EARN_VAULT_ADDRESS as `0x${string}`,
        abi: EarnVaultABI,
        functionName: 'withdraw',
        args: [
          parseEther(withdrawalAmount), // assets
          address, // receiver
          address, // owner
          parseEther(withdrawalAmount), // maxSharesIn (use same amount for simplicity)
        ],
      });
    } catch (error) {
      console.error('Withdraw failed:', error);
    }
  };

  const needsApproval = depositAmount && igmAllowance !== undefined &&
    parseEther(depositAmount) > (igmAllowance as bigint);

  return (
    <center>
      <br />
      <table cellPadding={10}>
        <tbody>
          <tr>
            <td>
              <button onClick={() => setActiveTab('deposit')} disabled={activeTab === 'deposit'}>
                Deposit igM
              </button>
            </td>
            <td>
              <button onClick={() => setActiveTab('withdrawal')} disabled={activeTab === 'withdrawal'}>
                Withdrawal vigM
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {activeTab === 'deposit' ? (
        <fieldset style={{ width: '500px', padding: '30px', marginTop: '20px' }}>
          <legend></legend>

          <table width="100%" cellPadding={10}>
            <tbody>
              <tr>
                <td>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
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
                  <strong>Deposit</strong>
                  <br />
                  <big>{expectedVigm ? formatBalance(formatUnits(expectedVigm as bigint, 18)) : '0.00'}</big>
                  <br />
                  <small>$0</small>
                </td>
                <td align="right">
                  <span><strong>vigM</strong></span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  {needsApproval ? (
                    <button onClick={handleApprove} disabled={!address || !depositAmount || isApprovePending} style={{ width: '100%', padding: '10px' }}>
                      {isApprovePending ? 'Approving...' : 'Approve igM'}
                    </button>
                  ) : (
                    <button onClick={handleDeposit} disabled={!address || !depositAmount || isDepositPending} style={{ width: '100%', padding: '10px' }}>
                      {isDepositPending ? 'Depositing...' : 'Deposit'}
                    </button>
                  )}
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
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="0"
                    size={25}
                  />
                  <br />
                  <small>$0</small>
                </td>
                <td align="right">
                  <span><strong>vigM</strong></span>
                  <br />
                  <small>{vigmBalance ? formatBalance(formatUnits(vigmBalance as bigint, 18)) : '0.00'} vigM</small>
                </td>
              </tr>
              <tr>
                <td colSpan={2}><hr /></td>
              </tr>
              <tr>
                <td>
                  <strong>Withdrawal in ~2 blocks</strong>
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
                  <button onClick={handleWithdraw} disabled={!address || !withdrawalAmount || isWithdrawPending} style={{ width: '100%', padding: '10px' }}>
                    {isWithdrawPending ? 'Withdrawing...' : 'Withdrawal'}
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
