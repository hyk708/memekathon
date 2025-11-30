import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { DepositMemeToken } from './components/DepositMemeToken';
import { WithdrawMemeToken } from './components/WithdrawMemeToken'; // Import the new component
import { SimulateYield } from './components/SimulateYield';

function App() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const wallet = wallets.find((w) => w.walletClientType === 'privy' || w.walletClientType === 'evm' || w.walletClientType === 'metamask');
  const evmAddress = wallet?.address;

  const { data: balance, isLoading } = useBalance({
    address: evmAddress as `0x${string}`,
    chainId: 43522, // Specify the chain ID for Insectarium
    query: {
        enabled: !!evmAddress, // Only fetch balance if address is available
    }
  });

  const displayBalance = balance?.value !== undefined
    ? formatUnits(balance.value, balance.decimals)
    : '0';

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>Memecore LRT dApp (with Privy)</h1>

      {ready && !authenticated && (
        <>
          <p>Login to get started!</p>
          <button onClick={login}>Login</button>
        </>
      )}

      {ready && authenticated && (
        <>
          <p>Welcome, {user?.email || user?.id}!</p>
          {evmAddress && (
            <div>
              <p>Wallet Address: {evmAddress}</p>
              <p>Balance: {isLoading ? 'Fetching...' : `${displayBalance} ${balance?.symbol}`}</p>
            </div>
          )}
          <hr style={{margin: '2rem 0'}} />
          <div style={{display: 'flex', justifyContent: 'center', gap: '2rem'}}>
            <DepositMemeToken />
            <WithdrawMemeToken />
          </div>
          <SimulateYield />
          <hr style={{margin: '2rem 0'}} />
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}

export default App;
