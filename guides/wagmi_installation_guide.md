Create Config
Create and export a new Wagmi config using createConfig.

config.ts

import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
In this example, Wagmi is configured to use the Mainnet and Sepolia chains, and injected connector. Check out the createConfig docs for more configuration options.

Wrap App in Context Provider
Wrap your app in the WagmiProvider React Context Provider and pass the config you created earlier to the config property.


app.tsx

config.ts

import { WagmiProvider } from 'wagmi'
import { config } from './config'

function App() {
  return (
    <WagmiProvider config={config}>
      {/** ... */}
    </WagmiProvider>
  )
}
Check out the WagmiProvider docs to learn more about React Context in Wagmi.

Setup TanStack Query
Inside the WagmiProvider, wrap your app in a TanStack Query React Context Provider, e.g. QueryClientProvider, and pass a new QueryClient instance to the client property.


app.tsx

config.ts

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from './config'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/** ... */}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
Check out the TanStack Query docs to learn about the library, APIs, and more.

Use Wagmi
Now that everything is set up, every component inside the Wagmi and TanStack Query Providers can use Wagmi React Hooks.


profile.tsx

app.tsx

config.ts

import { useConnection, useEnsName } from 'wagmi'

export function Profile() {
  const { address } = useConnection()
  const { data, error, status } = useEnsName({ address })
  if (status === 'pending') return <div>Loading ENS name</div>
  if (status === 'error')
    return <div>Error fetching ENS name: {error.message}</div>
  return <div>ENS name: {data}</div>
}

config.ts

import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})