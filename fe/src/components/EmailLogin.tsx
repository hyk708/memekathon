import { useState } from 'react';
import './EmailLogin.css';
import { useLoginWithEmail } from '@privy-io/react-auth';

export function EmailLogin() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const { sendCode, loginWithCode, state } = useLoginWithEmail({
    onComplete: (user) => {
      console.log('Login complete:', user);
    },
    onError: (error) => {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message}`);
    },
  });

  const handleSendCode = async () => {
    if (!email) {
      alert('Please enter email');
      return;
    }
    try {
      await sendCode({ email });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleLogin = async () => {
    if (!code) {
      alert('Please enter code');
      return;
    }
    try {
      await loginWithCode({ code });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <fieldset>
      <legend><strong>Email Login</strong></legend>

      {/* Step 1: Enter email */}
      {(state.status === 'initial' || state.status === 'error') && (
        <>
          <label>
            <strong>Email:</strong>
            <br />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={state.status === 'sending-code'}
            />
          </label>
          <br />
          <button
            onClick={handleSendCode}
            disabled={!email || state.status === 'sending-code'}
          >
            {state.status === 'sending-code' ? 'Sending...' : 'Send Code'}
          </button>
          {state.status === 'error' && state.error && (
            <>
              <br />
              <small><strong>Error:</strong> {state.error.message}</small>
            </>
          )}
        </>
      )}

      {/* Step 2: Enter code */}
      {state.status === 'awaiting-code-input' && (
        <>
          <p>✓ Code sent to <strong>{email}</strong></p>
          <label>
            <strong>Verification Code:</strong>
            <br />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              disabled={state.status === 'submitting-code'}
            />
          </label>
          <br />
          <button
            onClick={handleLogin}
            disabled={!code || state.status === 'submitting-code'}
          >
            {state.status === 'submitting-code' ? 'Verifying...' : 'Login'}
          </button>
          <br />
          <small>
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>
              Use different email
            </a>
          </small>
        </>
      )}

      {/* Submitting */}
      {state.status === 'submitting-code' && (
        <p><strong>Verifying code...</strong></p>
      )}

      {/* Success */}
      {state.status === 'done' && (
        <p><strong>✓ Login successful!</strong></p>
      )}
    </fieldset>
  );
}
