import React, { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSignTypedData } from 'wagmi';
import { formatUnits, parseUnits, type Address } from 'viem';
import { MEME_TOKEN_ABI } from '../abis/MemeToken';
import { LRTVault_ABI } from '../abis/LRTVault';
import { IPERMIT2_ABI } from '../abis/IPermit2';

import { MEME_TOKEN_ADDRESS, LRT_VAULT_ADDRESS, PERMIT2_ADDRESS } from '../constants/contractAddresses';

export function DepositMemeToken() {
  const [amount, setAmount] = useState<string>('');
  const { address: evmAddress, chainId } = useAccount();

  // --- Read contract data ---
  const { data: memeTokenBalance, refetch: refetchMemeTokenBalance } = useReadContract({
    address: MEME_TOKEN_ADDRESS as Address,
    abi: MEME_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [evmAddress as Address],
    query: { enabled: !!evmAddress, refetchInterval: 5000 }
  });

  const { data: lrtTokenAddress } = useReadContract({
    address: LRT_VAULT_ADDRESS as Address,
    abi: LRTVault_ABI,
    functionName: 'lrt',
    query: { enabled: !!evmAddress }
  });

  const { data: lrtBalance, refetch: refetchLrtBalance } = useReadContract({
    address: lrtTokenAddress as Address,
    abi: MEME_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [evmAddress as Address],
    query: { enabled: !!evmAddress && !!lrtTokenAddress, refetchInterval: 5000 }
  });

  const { data: exchangeRate, refetch: refetchExchangeRate } = useReadContract({
    address: LRT_VAULT_ADDRESS as Address,
    abi: LRTVault_ABI,
    functionName: 'convertToAssets',
    args: [parseUnits('1', 18)],
    query: { enabled: true, refetchInterval: 5000 }
  });

  const { data: nonceData, refetch: refetchNonce, isLoading: isNonceLoading } = useReadContract({
    address: PERMIT2_ADDRESS,
    abi: IPERMIT2_ABI,
    functionName: 'nonces',
    args: [evmAddress as Address],
    query: { enabled: !!evmAddress },
  });

  // For debugging
  useEffect(() => {
    console.log('Permit2 Nonce State:', { nonceData, isNonceLoading });
  }, [nonceData, isNonceLoading]);

  // --- Permit2 deposit logic ---
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContract, data: depositHash, isPending: isDepositing, error: depositError } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

  const handleDeposit = async () => {
    if (!evmAddress || !amount || nonceData === undefined || nonceData === null) {
      alert('Wallet not ready or amount not set.');
      return;
    }

    const amountToDeposit = parseUnits(amount, 18);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 minutes
    const nonce = (nonceData as any)[0]; // The 'word' from the nonces tuple

    try {
      const permitMsg = {
        permitted: {
          token: MEME_TOKEN_ADDRESS as `0x${string}`,
          amount: amountToDeposit,
        },
        spender: LRT_VAULT_ADDRESS as `0x${string}`, // The contract that will call permitTransferFrom
        nonce: nonce as bigint,
        deadline: deadline,
      };

      const signature = await signTypedDataAsync({
        domain: {
          name: 'Permit2',
          chainId: chainId,
          verifyingContract: PERMIT2_ADDRESS,
        },
        types: {
          PermitTransferFrom: [
            { name: 'permitted', type: 'TokenPermissions' },
            { name: 'spender', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
          TokenPermissions: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
        },
        primaryType: 'PermitTransferFrom',
        message: permitMsg,
      });
      
      const transferDetails = {
          to: LRT_VAULT_ADDRESS,
          requestedAmount: amountToDeposit
      };

      writeContract({
        address: LRT_VAULT_ADDRESS as Address,
        abi: LRTVault_ABI,
        functionName: 'depositWithPermit',
        args: [permitMsg, transferDetails, evmAddress, signature],
      });

    } catch (e: any) {
      console.error(e);
      alert(`An error occurred: ${e.message}`);
    }
  };
  
  useEffect(() => {
    if (isSuccess) {
      refetchMemeTokenBalance();
      refetchLrtBalance();
      refetchExchangeRate();
      refetchNonce();
    }
  }, [isSuccess, refetchMemeTokenBalance, refetchLrtBalance, refetchExchangeRate, refetchNonce]);

  const parsedMemeTokenBalance = memeTokenBalance ? formatUnits(memeTokenBalance as bigint, 18) : '0';
  const parsedLrtBalance = lrtBalance ? formatUnits(lrtBalance as bigint, 18) : '0';
  const parsedExchangeRate = exchangeRate ? formatUnits(exchangeRate as bigint, 18) : '0';

  return (
    <fieldset>
      <legend><strong>Deposit Iggnoyk (KG)</strong></legend>
      {evmAddress ? (
        <>
          <p><strong>Rate:</strong> 1 stKG = {parsedExchangeRate} KG</p>
          <p><strong>Your KG:</strong> {parsedMemeTokenBalance}</p>
          <p><strong>Your stKG:</strong> {parsedLrtBalance}</p>
          <hr />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
          <br />
          <button
            onClick={handleDeposit}
            disabled={!amount || isDepositing || isDepositConfirming || isNonceLoading}
          >
            {isNonceLoading ? 'Loading...' : (isDepositing || isDepositConfirming ? 'Depositing...' : 'Deposit')}
          </button>
          {depositError && (
            <>
              <br />
              <small><strong>Error:</strong> {depositError.message}</small>
            </>
          )}
        </>
      ) : (
        <p>Connect wallet to deposit</p>
      )}
    </fieldset>
  );
}