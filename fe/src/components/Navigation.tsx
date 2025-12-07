import { Link, NavLink } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import memecoreLogo from '../assets/memecorelogo.svg';

export function Navigation() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const walletAddress = user?.wallet?.address;

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/">
          <img src={memecoreLogo} alt="Memecore Logo" height="30" />
        </Link>
      </div>
      <div className="nav-links">
        <NavLink to="/stake">Stake</NavLink>
        <NavLink to="/earn">Earn</NavLink>
        {/* <NavLink to="/points">Point</NavLink>
        <NavLink to="/docs">Docs</NavLink> */}
      </div>
      <div className="nav-connect">
        {ready && !authenticated ? (
          <button className="btn" onClick={login}>Connect Wallet</button>
        ) : ready && authenticated && walletAddress ? (
          <button className="btn" onClick={logout}>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </button>
        ) : (
          <button className="btn" disabled>Loading...</button>
        )}
      </div>
    </nav>
  );
}