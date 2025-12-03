import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { MEME_TOKEN_ABI } from '../abis/MemeToken';
import { LRTVault_ABI } from '../abis/LRTVault';

import { MEME_TOKEN_ADDRESS, LRT_VAULT_ADDRESS } from '../constants/contractAddresses';

export function WithdrawMemeToken() {
  const [amount, setAmount] = useState<string>('');
  const { address } = useAccount();
  const chainId = useChainId();

  // --- Read LRT Token Address ---
  const { data: lrtTokenAddress } = useReadContract({
    address: LRT_VAULT_ADDRESS as `0x${string}`,
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
      address: LRT_VAULT_ADDRESS as `0x${string}`,
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
    <fieldset>
      <legend><strong>Withdraw Iggnoyk (KG)</strong></legend>
      {address ? (
        <>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
          <br />
          <button
            onClick={handleWithdraw}
            disabled={!amount || isWithdrawing || isWithdrawConfirming}
          >
            {isWithdrawing || isWithdrawConfirming ? 'Withdrawing...' : 'Withdraw'}
          </button>
          {isWithdrawSuccess && (
            <>
              <br />
              <strong>✓ Success!</strong>
            </>
          )}
          {withdrawError && (
            <>
              <br />
              <small><strong>Error:</strong> {(withdrawError as Error)?.message}</small>
            </>
          )}
        </>
      ) : (
        <p>Connect wallet to withdraw</p>
      )}
    </fieldset>
  );
}
