import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { EmailLogin } from './components/EmailLogin';
import { DepositMemeToken } from './components/DepositMemeToken';
import { WithdrawMemeToken } from './components/WithdrawMemeToken';
import { SimulateYield } from './components/SimulateYield';

function App() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  // Find any available wallet (더 넓은 범위로 검색)
  const wallet = wallets.length > 0 ? wallets[0] : null;
  const evmAddress = wallet?.address;

  console.log('Wallets:', wallets);
  console.log('Selected wallet:', wallet);
  console.log('EVM Address:', evmAddress);

  const { data: balance, isLoading, error } = useBalance({
    address: evmAddress as `0x${string}`,
    chainId: 43522,
    query: {
        enabled: !!evmAddress, // Only fetch balance if address is available
        retry: false, // Don't retry on error
    }
  });

  console.log('Balance query:', { data: balance, isLoading, error });

  const displayBalance = balance?.value !== undefined
    ? formatUnits(balance.value, balance.decimals)
    : '0';

  return (
    <div>
      <h1>Memecore LRT dApp</h1>
      <hr />

      {ready && !authenticated && (
        <>
          <h2>Login to get started</h2>
          <EmailLogin />
          <hr />
          <p><em>Or use other methods:</em></p>
          <button onClick={login}>Login with Wallet/Social</button>
        </>
      )}

      {ready && authenticated && (
        <>
          <h2>Welcome, {user?.email?.address || user?.id || 'User'}!</h2>

          {wallets.length === 0 && (
            <p><strong>⚠ Creating embedded wallet...</strong> (wallets: {wallets.length})</p>
          )}

          {evmAddress ? (
            <>
              <p><strong>Address:</strong> <code>{evmAddress}</code></p>
              <p><strong>Balance:</strong> {isLoading ? 'Loading...' : error ? 'Failed' : `${displayBalance} ${balance?.symbol || 'M'}`}</p>
            </>
          ) : (
            <>
              <p><strong>❌ No wallet address</strong></p>
              <p>Type: {wallet?.walletClientType || 'none'}</p>
              <button onClick={() => {
                if (wallet && 'connect' in wallet) {
                  (wallet as any).connect();
                }
              }}>
                Connect Wallet
              </button>
            </>
          )}

          <hr />

          {evmAddress ? (
            <>
              <DepositMemeToken />
              <br />
              <WithdrawMemeToken />
              <br />
              <SimulateYield />
            </>
          ) : (
            <p><em>Connect wallet to use dApp features</em></p>
          )}

          <hr />
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}

export default App;
