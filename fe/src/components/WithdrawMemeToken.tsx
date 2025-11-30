import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { MEME_TOKEN_ABI } from '../abis/MemeToken';
import { LRTVault_ABI } from '../abis/LRTVault';

// --- Contract Addresses ---
const MEME_TOKEN_ADDRESS = '0x2f57c4abe475f0120dcb08afeb3e116bb8000f40';
const LRTVault_ADDRESS = '0x2c400fa1935fb12e94c6cba612ab046daa6268e4';

export function WithdrawMemeToken() {
  const [amount, setAmount] = useState<string>('');
  const { address } = useAccount();
  const chainId = useChainId();

  // --- Read LRT Token Address ---
  const { data: lrtTokenAddress } = useReadContract({
    address: LRTVault_ADDRESS as `0x${string}`,
    abi: LRTVault_ABI,
    functionName: 'lrt',
    chainId: chainId,
    query: { enabled: !!address }
  });

  // --- Refetch Balances ---
  const { refetch: refetchMemeTokenBalance } = useReadContract({
    address: MEME_TOKEN_ADDRESS as `0x${string}`,
    abi: MEME_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: chainId,
    query: { enabled: false } // Initially disabled, only for refetching
  });
  const { refetch: refetchLrtBalance } = useReadContract({
    address: lrtTokenAddress as `0x${string}`,
    abi: MEME_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: chainId,
    query: { enabled: false } // Initially disabled, only for refetching
  });

  // --- Withdraw Logic ---
  const { writeContract: writeWithdraw, data: withdrawHash, isPending: isWithdrawing, error: withdrawError } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const handleWithdraw = async () => {
    if (!address || !amount) {
      alert('Please enter amount');
      return;
    }
    const amountBigInt = parseUnits(amount, 18);
    // The withdraw function takes the amount of underlying assets to receive
    writeWithdraw({
      address: LRTVault_ADDRESS as `0x${string}`,
      abi: LRTVault_ABI,
      functionName: 'withdraw',
      args: [amountBigInt, address, address, BigInt(2) ** BigInt(256) - BigInt(1)], // assets, receiver, owner, maxSharesIn (no slippage)
      chainId: chainId,
    });
  };

  // --- Refetch balances after successful withdraw ---
  useEffect(() => {
    if (isWithdrawSuccess) {
      refetchMemeTokenBalance();
      refetchLrtBalance();
    }
  }, [isWithdrawSuccess, refetchMemeTokenBalance, refetchLrtBalance]);

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0', borderRadius: '8px' }}>
      <h3>Withdraw Iggnoyk (KG) from LRTVault</h3>
      {address ? (
        <>
          <div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to withdraw (KG)"
              style={{ padding: '0.5rem', marginRight: '0.5rem' }}
            />
            <button
              onClick={handleWithdraw}
              disabled={!amount || isWithdrawing || isWithdrawConfirming}
              style={{ padding: '0.05rem 0.5rem' }}
            >
              {isWithdrawing || isWithdrawConfirming ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </div>
          {isWithdrawSuccess && <p>Withdraw successful!</p>}
          {withdrawError && <p style={{ color: 'red' }}>Withdraw Error: {(withdrawError as Error)?.message}</p>}
        </>
      ) : (
        <p>Please connect your wallet to withdraw.</p>
      )}
    </div>
  );
}
