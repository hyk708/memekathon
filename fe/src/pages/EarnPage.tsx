import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { earnVaultAbi } from '../abis/EarnVault';
import { IGM_TOKEN_ADDRESS, EARN_VAULT_ADDRESS, VIGM_TOKEN_ADDRESS } from '../constants/contractAddresses';
import { formatBalance } from '../utils/formatBalance';
import { erc20Abi } from 'viem';

export function EarnPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');

  const { wallets } = useWallets();
  const wallet = wallets.length > 0 ? wallets[0] : null;
  const address = wallet?.address as `0x${string}` | undefined;

  const { data: blockNumber } = useBlockNumber({ watch: true });

  // --- Read Contract Hooks ---
  const { data: igmBalance, refetch: refetchIgmBalance } = useReadContract({
    address: IGM_TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: vigmBalance, refetch: refetchVigmBalance } = useReadContract({
    address: VIGM_TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: withdrawalRequest, refetch: refetchWithdrawalRequest } = useReadContract({
    address: EARN_VAULT_ADDRESS as `0x${string}`,
    abi: earnVaultAbi,
    functionName: 'withdrawalRequests',
    args: address ? [address] : undefined,
  });

  const { data: expectedVigm } = useReadContract({
    address: EARN_VAULT_ADDRESS as `0x${string}`,
    abi: earnVaultAbi,
    functionName: 'convertToShares',
    args: depositAmount ? [parseEther(depositAmount)] : undefined,
  });

  const { data: expectedIgm } = useReadContract({
    address: EARN_VAULT_ADDRESS as `0x${string}`,
    abi: earnVaultAbi,
    functionName: 'convertToAssets',
    args: withdrawalAmount ? [parseEther(withdrawalAmount)] : undefined,
  });
  
  const { data: igmAllowance, refetch: refetchIgmAllowance } = useReadContract({
    address: IGM_TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, EARN_VAULT_ADDRESS as `0x${string}`] : undefined,
  });

  // --- Write Contract Hooks & TX Receipts ---
  const { writeContract: approve, data: approveHash, error: approveError } = useWriteContract();
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: deposit, data: depositHash, error: depositTxError } = useWriteContract();
  const { data: depositReceipt, isLoading: isDepositPending, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

  const { writeContract: requestWithdraw, data: requestWithdrawHash, error: requestWithdrawError } = useWriteContract();
  const { isLoading: isRequestWithdrawPending, isSuccess: isRequestWithdrawSuccess } = useWaitForTransactionReceipt({ hash: requestWithdrawHash });
  
  const { writeContract: completeWithdraw, data: completeWithdrawHash, error: completeWithdrawError } = useWriteContract();
  const { isLoading: isCompleteWithdrawPending, isSuccess: isCompleteWithdrawSuccess } = useWaitForTransactionReceipt({ hash: completeWithdrawHash });

  // --- Effects for Refetching Data ---
  useEffect(() => {
    if (isApproveSuccess) {
      refetchIgmAllowance();
    }
  }, [isApproveSuccess, refetchIgmAllowance]);
  
  useEffect(() => {
    if (isDepositSuccess || isRequestWithdrawSuccess || isCompleteWithdrawSuccess) {
      refetchIgmBalance();
      refetchVigmBalance();
      refetchWithdrawalRequest();
      setDepositAmount('');
      setWithdrawalAmount('');
    }
  }, [isDepositSuccess, isRequestWithdrawSuccess, isCompleteWithdrawSuccess, refetchIgmBalance, refetchVigmBalance, refetchWithdrawalRequest]);

  // --- Handlers ---
  const handleApprove = () => approve({
    address: IGM_TOKEN_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'approve',
    args: [EARN_VAULT_ADDRESS as `0x${string}`, parseEther(depositAmount || '0')],
  });

  const handleDeposit = () => deposit({
    address: EARN_VAULT_ADDRESS as `0x${string}`,
    abi: earnVaultAbi,
    functionName: 'deposit',
    args: [parseEther(depositAmount || '0'), address!, 0n],
  });
  
  const handleRequestWithdrawal = () => requestWithdraw({
    address: EARN_VAULT_ADDRESS as `0x${string}`,
    abi: earnVaultAbi,
    functionName: 'requestWithdrawal',
    args: [parseEther(withdrawalAmount || '0'), address!],
  });

  const handleCompleteWithdrawal = () => completeWithdraw({
    address: EARN_VAULT_ADDRESS as `0x${string}`,
    abi: earnVaultAbi,
    functionName: 'completeWithdrawal',
    args: [address!],
  });

  const needsApproval = depositAmount && igmAllowance !== undefined && parseEther(depositAmount) > (igmAllowance as bigint);
  
  const [pendingShares, unlockBlock] = withdrawalRequest || [0n, 0n];
  const hasPendingWithdrawal = pendingShares > 0n;
  const isWithdrawalReady = hasPendingWithdrawal && blockNumber !== undefined && blockNumber >= unlockBlock;
  const anyError = approveError || depositTxError || requestWithdrawError || completeWithdrawError;

  return (
    <div className="card">
      <div className="tab-buttons">
        <button onClick={() => setActiveTab('deposit')} className={`tab-btn ${activeTab === 'deposit' ? 'active' : ''}`}>
          Deposit igM
        </button>
        <button onClick={() => setActiveTab('withdrawal')} className={`tab-btn ${activeTab === 'withdrawal' ? 'active' : ''}`}>
          Withdraw vigM
        </button>
      </div>

      {activeTab === 'deposit' ? (
        <div>
          <h2>Deposit igM, receive vigM</h2>
          <div className="input-group">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.0"
            />
            <div className="token-info">
              <span>igM</span>
              <small>Balance: {igmBalance ? formatBalance(formatUnits(igmBalance as bigint, 18)) : '0.00'}</small>
            </div>
          </div>
          <div className="output-group">
            <span>You will receive ~</span>
            <span>{expectedVigm ? formatBalance(formatUnits(expectedVigm as bigint, 18)) : '0.00'} vigM</span>
          </div>
          {needsApproval ? (
            <button onClick={handleApprove} disabled={!address || !depositAmount || isApprovePending} className="btn">
              {isApprovePending ? 'Approving...' : 'Approve igM'}
            </button>
          ) : (
            <button onClick={handleDeposit} disabled={!address || !depositAmount || isDepositPending} className="btn">
              {isDepositPending ? 'Depositing...' : 'Deposit'}
            </button>
          )}
        </div>
      ) : (
        <div>
          <h2>Withdraw vigM to receive igM</h2>
          {hasPendingWithdrawal ? (
             <div className="withdrawal-status">
              <h3>Withdrawal Requested</h3>
              <p>Amount: {formatBalance(formatUnits(pendingShares, 18))} vigM</p>
              <p>Unlock Block: {unlockBlock.toString()}</p>
              <p>Current Block: {blockNumber?.toString()}</p>
              <button 
                onClick={handleCompleteWithdrawal} 
                disabled={!isWithdrawalReady || isCompleteWithdrawPending}
                className="btn"
              >
                {isCompleteWithdrawPending ? 'Completing...' : (isWithdrawalReady ? 'Complete Withdrawal' : `Waiting for block ${unlockBlock.toString()}...`)}
              </button>
            </div>
          ) : (
            <div>
              <div className="input-group">
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.0"
                />
                <div className="token-info">
                  <span>vigM</span>
                  <small>Balance: {vigmBalance ? formatBalance(formatUnits(vigmBalance as bigint, 18)) : '0.00'}</small>
                </div>
              </div>
              <div className="output-group">
                <span>You will receive ~</span>
                <span>{expectedIgm ? formatBalance(formatUnits(expectedIgm as bigint, 18)) : '0.00'} igM</span>
              </div>
              <button 
                onClick={handleRequestWithdrawal} 
                disabled={!address || !withdrawalAmount || isRequestWithdrawPending || parseFloat(withdrawalAmount) > parseFloat(formatUnits(vigmBalance || 0n, 18))}
                className="btn"
              >
                {isRequestWithdrawPending ? 'Requesting...' : 'Request Withdrawal'}
              </button>
              <small className="info-text">Withdrawal has a 2 block delay.</small>
            </div>
          )}
        </div>
      )}
      {anyError && (
        <div style={{ color: 'red', marginTop: '10px', wordWrap: 'break-word' }}>
          <strong>Error:</strong> {(anyError as any).shortMessage || anyError.message}
        </div>
      )}
    </div>
  );
}