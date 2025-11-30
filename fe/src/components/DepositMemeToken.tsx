import React, { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { MEME_TOKEN_ABI } from '../abis/MemeToken';
import { LRTVault_ABI } from '../abis/LRTVault';

// --- Contract Addresses ---
const MEME_TOKEN_ADDRESS = '0x2f57c4abe475f0120dcb08afeb3e116bb8000f40';
const LRTVault_ADDRESS = '0x2c400fa1935fb12e94c6cba612ab046daa6268e4';

export function DepositMemeToken() {
  const [amount, setAmount] = useState<string>('');
  const { wallets } = useWallets();
  const chainId = useChainId(); // Get current chain ID

  const wallet = wallets.find((w) => w.walletClientType === 'privy' || w.walletClientType === 'evm' || w.walletClientType === 'metamask');
  const evmAddress = wallet?.address;

  // --- Read Contract Data ---
  const { data: memeTokenBalance, refetch: refetchMemeTokenBalance } = useReadContract({
    address: MEME_TOKEN_ADDRESS as `0x${string}`,
    abi: MEME_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [evmAddress as `0x${string}`],
    chainId: chainId,
    query: { enabled: !!evmAddress, refetchInterval: 5000 }
  });

  const { data: lrtTokenAddress } = useReadContract({
    address: LRTVault_ADDRESS as `0x${string}`,
    abi: LRTVault_ABI,
    functionName: 'lrt',
    chainId: chainId,
    query: { enabled: !!evmAddress }
  });

  const { data: lrtBalance, refetch: refetchLrtBalance } = useReadContract({
    address: lrtTokenAddress as `0x${string}`,
    abi: MEME_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [evmAddress as `0x${string}`],
    chainId: chainId,
    query: { enabled: !!evmAddress && !!lrtTokenAddress, refetchInterval: 5000 }
  });

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
    if (!evmAddress || !amount) return alert('Please enter amount');
    writeApprove({
      address: MEME_TOKEN_ADDRESS as `0x${string}`,
      abi: MEME_TOKEN_ABI,
      functionName: 'approve',
      args: [LRTVault_ADDRESS as `0x${string}`, parseUnits(amount, 18)],
      chainId: chainId,
    });
  };

  // --- Deposit Logic ---
  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositing, error: depositError } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

  const handleDeposit = async () => {
    if (!evmAddress || !amount) return alert('Please enter amount');
    writeDeposit({
      address: LRTVault_ADDRESS as `0x${string}`,
      abi: LRTVault_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 18), evmAddress as `0x${string}`, 0],
      chainId: chainId,
    });
  };

  // --- Refetch balances after successful transactions ---
  useEffect(() => {
    if (isDepositSuccess) {
      refetchMemeTokenBalance();
      refetchLrtBalance();
      refetchExchangeRate();
    }
  }, [isDepositSuccess, refetchMemeTokenBalance, refetchLrtBalance, refetchExchangeRate]);

  const parsedMemeTokenBalance = memeTokenBalance ? formatUnits(memeTokenBalance as bigint, 18) : '0';
  const parsedLrtBalance = lrtBalance ? formatUnits(lrtBalance as bigint, 18) : '0';
  const parsedExchangeRate = exchangeRate ? formatUnits(exchangeRate as bigint, 18) : '0';

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0', borderRadius: '8px' }}>
      <h3>Deposit Iggnoyk (KG) into LRTVault</h3>
      {evmAddress ? (
        <>
          <p style={{ fontWeight: 'bold' }}>Current Rate: 1 stKG = {parsedExchangeRate} KG</p>
          <p>Your Iggnoyk Balance: {parsedMemeTokenBalance} KG</p>
          <p>Your stKG Balance: {parsedLrtBalance} stKG</p>

          <div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to deposit (KG)"
              style={{ padding: '0.5rem', marginRight: '0.5rem' }}
            />
            <button
              onClick={handleApprove}
              disabled={!amount || isApproving || isApproveConfirming}
              style={{ padding: '0.05rem 0.5rem', marginRight: '0.2rem' }}
            >
              {isApproving || isApproveConfirming ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleDeposit}
              disabled={!amount || isDepositing || isDepositConfirming || !isApproveSuccess}
              style={{ padding: '0.05rem 0.5rem' }}
            >
              {isDepositing || isDepositConfirming ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
          {/* Status Messages */}
        </>
      ) : (
        <p>Please connect your wallet to deposit.</p>
      )}
    </div>
  );
}
