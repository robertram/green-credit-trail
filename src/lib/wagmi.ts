import { createConfig, http } from 'wagmi';
import { avalanche, avalancheFuji, mainnet } from 'wagmi/chains';
import { getDefaultWallets } from '@rainbow-me/rainbowkit';

const { connectors } = getDefaultWallets({
  appName: 'GreenLedger',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
});

export const config = createConfig({
  chains: [avalancheFuji, avalanche, mainnet],
  connectors,
  transports: {
    [avalancheFuji.id]: http(),
    [avalanche.id]: http(),
    [mainnet.id]: http(),
  },
});
