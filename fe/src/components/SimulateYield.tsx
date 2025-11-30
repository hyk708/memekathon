import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { MEME_TOKEN_ABI } from '../abis/MemeToken';
import { MOCK_STRATEGY_ABI } from '../abis/MockStrategy';
import { LRTVault_ABI } from '../abis/LRTVault'; // Import LRTVault ABI

// --- Contract Addresses ---
const MEME_TOKEN_ADDRESS = '0x2f57c4abe475f0120dcb08afeb3e116bb8000f40';
const MOCK_STRATEGY_ADDRESS = '0xfa397a1878188c7cb05a3379567ff4cc99cffc46';
const LRTVault_ADDRESS = '0x2c400fa1935fb12e94c6cba612ab046daa6268e4'; // Need vault address for reading rate

export function SimulateYield() {
  const [amount, setAmount] = useState<string>('');
  const { address } = useAccount();
  const chainId = useChainId();

  // --- Read Exchange Rate ---
  const { data: exchangeRate, refetch: refetchExchangeRate } = useReadContract({
    address: LRTVault_ADDRESS as `0x${string}`,
    abi: LRTVault_ABI,
    functionName: 'convertToAssets',
    args: [parseUnits('1', 18)], // Calculate value for 1 LRT
    chainId: chainId,
    query: { enabled: true, refetchInterval: 5000 }
  });

  // --- Approve Logic ---
  const { writeContract: writeApprove, data: approveHash, isPending: isApproving, error: approveError } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const handleApprove = async () => {
    if (!address || !amount) return alert('Please enter amount');
    writeApprove({
      address: MEME_TOKEN_ADDRESS as `0x${string}`,
      abi: MEME_TOKEN_ABI,
      functionName: 'approve',
      args: [MOCK_STRATEGY_ADDRESS as `0x${string}`, parseUnits(amount, 18)],
      chainId: chainId,
    });
  };

  // --- Deposit Rewards Logic ---
  const { writeContract: writeDepositRewards, data: depositRewardsHash, isPending: isDepositing, error: depositRewardsError } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositRewardsHash });

  const handleDepositRewards = async () => {
    if (!address || !amount) return alert('Please enter amount');
    writeDepositRewards({
      address: MOCK_STRATEGY_ADDRESS as `0x${string}`,
      abi: MOCK_STRATEGY_ABI,
      functionName: 'adminDepositRewards',
      args: [parseUnits(amount, 18)],
      chainId: chainId,
    });
  };

  // --- Refetch rate after successful reward deposit ---
  useEffect(() => {
    if (isDepositSuccess) {
      refetchExchangeRate();
    }
  }, [isDepositSuccess, refetchExchangeRate]);

  const parsedExchangeRate = exchangeRate ? formatUnits(exchangeRate as bigint, 18) : '0';

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0', borderRadius: '8px', backgroundColor: '#f0f8ff' }}>
      <h3>Viral Grant Simulation</h3>
      <p>Simulate the Iggnoyk project meeting PoM criteria and receiving a grant from the Viral Grants Reserve.</p>
      <p style={{ fontWeight: 'bold' }}>Current Rate: 1 stKG = {parsedExchangeRate} KG</p>
      {address ? (
        <>
          <div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Grant amount (KG)"
              style={{ padding: '0.5rem', marginRight: '0.5rem' }}
            />
            <button
              onClick={handleApprove}
              disabled={!amount || isApproving || isApproveConfirming}
              style={{ padding: '0.05rem 0.5rem', marginRight: '0.2rem' }}
            >
              {isApproving || isApproveConfirming ? 'Approving...' : '1. Approve Grant Spending'}
            </button>
            <button
              onClick={handleDepositRewards}
              disabled={!amount || isDepositing || isDepositConfirming || !isApproveSuccess}
              style={{ padding: '0.05rem 0.5rem' }}
            >
              {isDepositing || isDepositConfirming ? 'Awarding...' : '2. Award Viral Grant'}
            </button>
          </div>

          {(isApproving || isApproveConfirming || isDepositing || isDepositConfirming) && <p>Transaction pending...</p>}
          {isApproveSuccess && <p>Grant spending approved! Ready to award.</p>}
          {isDepositSuccess && <p>Viral Grant awarded! stKG value has increased.</p>}
          {approveError && <p style={{ color: 'red' }}>Approve Error: {(approveError as Error)?.message}</p>}
          {depositRewardsError && <p style={{ color: 'red' }}>Award Grant Error: {(depositRewardsError as Error)?.message}</p>}
        </>
      ) : (
        <p>Please connect your wallet to use simulation tools.</p>
      )}
    </div>
  );
}
