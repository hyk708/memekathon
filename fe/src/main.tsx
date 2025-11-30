import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineChain } from 'viem';
import { http } from 'wagmi';

// Correctly import createConfig and WagmiProvider from @privy-io/wagmi
import { createConfig, WagmiProvider } from '@privy-io/wagmi';

// Define the custom Insectarium chain
export const insectarium = defineChain({
  id: 43522,
  name: 'Insectarium',
  nativeCurrency: {
    decimals: 18,
    name: 'M',
    symbol: 'M',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.insectarium.memecore.net'],
    },
  },
});

// Create a wagmi config using the createConfig from @privy-io/wagmi
const wagmiConfig = createConfig({
  chains: [insectarium],
  transports: {
    [insectarium.id]: http(),
  },
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId="cmilcu3wq01yxl20ctwa31l1c"
      config={{
        defaultChain: insectarium,
        supportedChains: [insectarium],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <App />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  </StrictMode>
);
