import { Link } from 'react-router-dom';
import './Navigation.css';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import memecoreLogo from '../assets/memecorelogo.svg';

export function Navigation() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  // Get wallet address
  const wallet = wallets.length > 0 ? wallets[0] : null;
  const walletAddress = wallet?.address;

  return (
    <nav>
      <table border={0} width="100%" cellPadding={10}>
        <tbody>
          <tr>
            <td width="25%">
              <Link to="/">
                <img src={memecoreLogo} alt="Memecore Logo" height="30" />
              </Link>
            </td>
            <td width="50%" align="center">
              <table border={0} cellPadding={15}>
                <tbody>
                  <tr>
                    <td><Link to="/stake"><strong>Stake</strong></Link></td>
                    <td><Link to="/earn"><strong>Earn</strong></Link></td>
                    <td>Point</td>
                    <td>Docs</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td width="25%" align="right">
              {ready && !authenticated ? (
                <button onClick={login}>Connect</button>
              ) : ready && authenticated && walletAddress ? (
                <button onClick={logout}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</button>
              ) : (
                <button onClick={login}>Connect</button>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </nav>
  );
}
