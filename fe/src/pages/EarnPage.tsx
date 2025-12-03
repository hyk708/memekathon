import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { IERC20ABI } from '../abis/IERC20';
import { IGM_TOKEN_ADDRESS } from '../constants/contractAddresses';
import { formatBalance } from '../utils/formatBalance';

export function EarnPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');

  const { wallets } = useWallets();
  const wallet = wallets.length > 0 ? wallets[0] : null;
  const address = wallet?.address as `0x${string}` | undefined;

  // Get igM balance
  const { data: igmBalance } = useReadContract({
    address: IGM_TOKEN_ADDRESS as `0x${string}`,
    abi: IERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

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
                  <big>0.00</big>
                  <br />
                  <small>$0</small>
                </td>
                <td align="right">
                  <span><strong>vigM</strong></span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <button disabled={!address} style={{ width: '100%', padding: '10px' }}>
                    Deposit
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
                  <small>0.00 vigM</small>
                </td>
              </tr>
              <tr>
                <td colSpan={2}><hr /></td>
              </tr>
              <tr>
                <td>
                  <strong>Withdrawal in ~2 blocks</strong>
                  <br />
                  <big>0.00</big>
                  <br />
                  <small>$0</small>
                </td>
                <td align="right">
                  <span><strong>igM</strong></span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <button disabled={!address} style={{ width: '100%', padding: '10px' }}>
                    Withdrawal
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
