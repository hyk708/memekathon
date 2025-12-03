import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { NativeStakingVaultABI } from '../abis/NativeStakingVault';
import { IERC20ABI } from '../abis/IERC20';
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
    abi: IERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Get expected igM output
  const { data: expectedIgm } = useReadContract({
    address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
    abi: NativeStakingVaultABI,
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

    try {
      deposit({
        address: NATIVE_STAKING_VAULT_ADDRESS as `0x${string}`,
        abi: NativeStakingVaultABI,
        functionName: 'deposit',
        args: [address, 0n], // receiver, minSharesOut (0 for now)
        value: parseEther(amount),
      });
    } catch (error) {
      console.error('Stake failed:', error);
    }
  };

  return (
    <center>
      <h2>liquid staking on Memecore</h2>

      <fieldset style={{ width: '500px', padding: '30px', marginTop: '50px' }}>
        <legend></legend>

        <table width="100%" cellPadding={10}>
          <tbody>
            <tr>
              <td>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  size={30}
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
              <td colSpan={2}>
                <hr />
              </td>
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
                <br />
                <small>{igmBalance ? formatBalance(formatUnits(igmBalance as bigint, 18)) : '0.00'} igM</small>
              </td>
            </tr>
            <tr>
              <td colSpan={2} align="center">
                <button onClick={handleStake} disabled={!address || !amount || isDepositPending} style={{ width: '100%', padding: '10px' }}>
                  {isDepositPending ? 'Staking...' : 'Stake'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </fieldset>
    </center>
  );
}
