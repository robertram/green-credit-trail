# GreenLedger — Tokenized Carbon Credit Marketplace

A tokenized carbon credit marketplace on Avalanche C-Chain. Each environmental project gets its own ERC-20 token (1 token = 1 tCO₂ offset). Buyers purchase credits using AVAX.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│         wagmi + RainbowKit + ethers.js v6               │
└────────────────────┬────────────────────────────────────┘
                     │ calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CarbonMarketplace.sol                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  createProject()  → deploys CarbonToken         │    │
│  │  buyTokens()      → validates + transfers       │    │
│  │  verifyProject()  → admin only                  │    │
│  │  getAllProjects()  → registry view               │    │
│  └─────────────────────────────────────────────────┘    │
│                     │ deploys                            │
│                     ▼                                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  CarbonToken.sol  (one per project)             │    │
│  │  ERC-20 │ pricePerToken │ evidenceURI           │    │
│  │  mint() │ retire() │ withdraw()                 │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

AVAX Flow:
  Buyer ──[msg.value]──► CarbonMarketplace
                              │
                ┌─────────────┴──────────────┐
                ▼                            ▼
         CarbonToken.sol              feeRecipient
         (totalCost)                  (platformFee)
                │
                ▼
         issuer.withdraw()  ←── issuer pulls AVAX
```

---

## Deploy to Fuji Testnet — Step by Step

### 1. Prerequisites

```bash
node -v   # v18+
npm -v    # v9+
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

```bash
cp .env.example .env
```

Fill in:

```env
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
SNOWTRACE_API_KEY=YourSnowtraceAPIKey
VITE_WALLETCONNECT_PROJECT_ID=YourWalletConnectProjectId
```

> **Never commit your `.env` file.** It is listed in `.gitignore`.

### 4. Get Fuji test AVAX from the faucet

1. Go to **https://faucet.avax.network**
2. Select network: **Fuji (C-Chain)**
3. Paste your deployer wallet address
4. Request 2 AVAX (enough for deployment + test buys)

### 5. Compile contracts

```bash
npx hardhat compile
```

### 6. Run tests (local Hardhat network)

```bash
npx hardhat test
```

### 7. Deploy to Fuji

```bash
npx hardhat run scripts/deploy.ts --network fuji
```

You will see output like:

```
✅ CarbonMarketplace deployed at: 0xABC...
✅ Example CarbonToken deployed at: 0xDEF...
✅ Issuer approved marketplace to transfer 10000 MVC tokens
✅ Project verified by admin
```

### 8. Verify on Snowtrace

Verification runs automatically in `deploy.ts` if `SNOWTRACE_API_KEY` is set. View contracts at:

```
https://testnet.snowtrace.io/address/<CONTRACT_ADDRESS>
```

---

## Important: Issuer Approval Flow

Before buyers can purchase tokens, the **issuer must approve** the marketplace contract to transfer tokens on their behalf:

```solidity
// Issuer calls this once after creating their project
CarbonToken(tokenAddress).approve(marketplaceAddress, amount);
```

This is handled automatically in `scripts/deploy.ts` for the example project. In production, your frontend must prompt the issuer to call `approve()` before listing tokens for sale.

---

## ABI Summary for Frontend Integration

### CarbonMarketplace

| Function | Inputs | Returns | Notes |
|---|---|---|---|
| `createProject` | name, symbol, projectName, projectType, country, evidenceURI, pricePerToken, initialSupply | `address` | Deploys new CarbonToken |
| `buyTokens` | projectToken, amount | — | `payable` — send exact AVAX |
| `verifyProject` | projectToken | — | Admin only |
| `revokeVerification` | projectToken | — | Admin only |
| `getProjectDetails` | projectToken | struct | All metadata in one call |
| `getAllProjects` | — | `address[]` | Registry view |
| `getIssuerProjects` | issuer | `address[]` | Per-issuer view |

### CarbonToken

| Function | Inputs | Returns | Notes |
|---|---|---|---|
| `retire` | amount | — | Burns tokens, emits `TokensRetired` |
| `withdraw` | — | — | Issuer pulls AVAX |
| `updateEvidenceURI` | newURI | — | Issuer only |
| `updatePrice` | newPrice | — | Issuer only |
| `mint` | amount | — | Issuer only |
