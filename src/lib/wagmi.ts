import { createConfig, http } from 'wagmi';
import { avalanche, avalancheFuji, mainnet } from 'wagmi/chains';
import { getDefaultWallets } from '@rainbow-me/rainbowkit';

const { connectors } = getDefaultWallets({
  appName: 'GreenLedger',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
});

const fujiRpc = import.meta.env.VITE_FUJI_RPC_URL ?? 'undefined';

export const config = createConfig({
  chains: [avalancheFuji, avalanche, mainnet],
  connectors,
  transports: {
    [avalancheFuji.id]: http(fujiRpc),
    [avalanche.id]: http(),
    [mainnet.id]: http(),
  },
});
