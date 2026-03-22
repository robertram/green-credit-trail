# Frontend Integration Guide

How to call the key smart contract functions from this React frontend using wagmi v3 + ethers.js v6.

---

## 1. Connect to Avalanche C-Chain

The wagmi config in `src/lib/wagmi.ts` already includes Avalanche. RainbowKit handles chain switching in the UI. To prompt the user to switch programmatically:

```ts
import { useSwitchChain } from "wagmi";
import { avalanche } from "wagmi/chains";

const { switchChain } = useSwitchChain();
switchChain({ chainId: avalanche.id }); // 43114
```

---

## 2. Call `buyTokens()` with Correct AVAX Value

First compute the exact AVAX required (cost + platform fee), then send it as `value`.

```ts
import { useWriteContract, useReadContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { MARKETPLACE_ABI } from "@/lib/abis";

const MARKETPLACE_ADDRESS = "0xYourMarketplaceAddress";

// 1. Read token price and platform fee
const { data: details } = useReadContract({
  address: MARKETPLACE_ADDRESS,
  abi: MARKETPLACE_ABI,
  functionName: "getProjectDetails",
  args: [tokenAddress],
});

// 2. Compute required AVAX
const amount = 10n; // tokens to buy
const totalCost = details.tokenPrice * amount;
const fee = (totalCost * platformFeeBps) / 10_000n;
const requiredAvax = totalCost + fee;

// 3. Send transaction
const { writeContract } = useWriteContract();

writeContract({
  address: MARKETPLACE_ADDRESS,
  abi: MARKETPLACE_ABI,
  functionName: "buyTokens",
  args: [tokenAddress, amount],
  value: requiredAvax,
});
```

---

## 3. Listen to `TokensPurchased` Events in Real Time

Use wagmi's `useWatchContractEvent` to subscribe to purchase events.

```ts
import { useWatchContractEvent } from "wagmi";
import { MARKETPLACE_ABI } from "@/lib/abis";

useWatchContractEvent({
  address: MARKETPLACE_ADDRESS,
  abi: MARKETPLACE_ABI,
  eventName: "TokensPurchased",
  onLogs(logs) {
    logs.forEach((log) => {
      const { buyer, project, amount, avaxPaid } = log.args;
      console.log(`${buyer} bought ${amount} tokens for ${formatEther(avaxPaid)} AVAX`);
    });
  },
});
```

---

## 4. Read `evidenceURI` and Display Project Metadata

```ts
import { useReadContracts } from "wagmi";
import { CARBON_TOKEN_ABI } from "@/lib/abis";

const { data } = useReadContracts({
  contracts: [
    { address: tokenAddress, abi: CARBON_TOKEN_ABI, functionName: "projectName" },
    { address: tokenAddress, abi: CARBON_TOKEN_ABI, functionName: "projectType" },
    { address: tokenAddress, abi: CARBON_TOKEN_ABI, functionName: "country" },
    { address: tokenAddress, abi: CARBON_TOKEN_ABI, functionName: "evidenceURI" },
    { address: tokenAddress, abi: CARBON_TOKEN_ABI, functionName: "pricePerToken" },
    { address: tokenAddress, abi: CARBON_TOKEN_ABI, functionName: "totalRetired" },
  ],
});

// evidenceURI is an IPFS URI — resolve via a gateway:
const ipfsGateway = (uri: string) =>
  uri.replace("ipfs://", "https://ipfs.io/ipfs/");

const docUrl = ipfsGateway(data?.[3]?.result as string ?? "");
```

---

## 5. Call `retire()` and Show Offset Certificate Data

```ts
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CARBON_TOKEN_ABI } from "@/lib/abis";

const { writeContract, data: txHash } = useWriteContract();
const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

// Retire 5 tokens
writeContract({
  address: tokenAddress,
  abi: CARBON_TOKEN_ABI,
  functionName: "retire",
  args: [5n],
});

// Once receipt is available, parse the TokensRetired event
if (receipt) {
  // The event contains: by (address), amount (uint256), timestamp (uint256)
  // Use it to generate a certificate:
  const retiredEvent = receipt.logs[0]; // first log is TokensRetired
  console.log("Offset certificate data:", {
    retiredBy: retiredEvent.topics[1],  // indexed `by` address
    txHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
  });
}
```

---

## ABI Files

After running `npx hardhat compile`, copy the ABIs from `artifacts/contracts/`:

```
artifacts/contracts/CarbonMarketplace.sol/CarbonMarketplace.json  →  src/lib/abis/CarbonMarketplace.json
artifacts/contracts/CarbonToken.sol/CarbonToken.json              →  src/lib/abis/CarbonToken.json
```

Then import with type safety:

```ts
import CarbonMarketplaceJson from "@/lib/abis/CarbonMarketplace.json";
export const MARKETPLACE_ABI = CarbonMarketplaceJson.abi as const;
```
