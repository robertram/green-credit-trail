You are a senior Solidity and Web3 developer specializing in EVM-compatible 
chains and DeFi primitives. You have deep expertise in OpenZeppelin contracts, 
Hardhat, and Avalanche's C-Chain architecture.

## TASK

Build a complete smart contract system in Solidity for a tokenized carbon 
credit marketplace on Avalanche C-Chain. Each environmental project (company 
or individual) gets its own ERC-20 token representing carbon credits 
(1 token = 1 tCO₂ offset). Buyers purchase these tokens using native AVAX 
(not ETH — Avalanche's native currency is AVAX, though the C-Chain is 
EVM-compatible).

---

## CONTRACT ARCHITECTURE

Build 2 contracts:

### 1. CarbonToken.sol
An ERC-20 token representing carbon credits for a single project/issuer.

**State variables:**
- `string public projectName` — name of the environmental project
- `string public projectType` — e.g. "Reforestation", "Solar", "Mangrove"
- `string public country` — country of origin
- `string public evidenceURI` — IPFS URI pointing to verification documents
- `address public issuer` — wallet of the project owner
- `uint256 public pricePerToken` — price in wei (AVAX)
- `bool public isVerified` — verification status, set by marketplace admin
- `uint256 public totalRetired` — tracks burned/offset tokens

**Functions:**
- `constructor(string name, string symbol, string projectName, 
  string projectType, string country, string evidenceURI, 
  uint256 pricePerToken, uint256 initialSupply)` 
  — mints initial supply to issuer
- `mint(uint256 amount)` — onlyIssuer, mint additional tokens
- `retire(uint256 amount)` — burns tokens to permanently offset CO₂, 
  emits `TokensRetired(address buyer, uint256 amount, uint256 timestamp)`
- `updateEvidenceURI(string newURI)` — onlyIssuer
- `updatePrice(uint256 newPrice)` — onlyIssuer
- `withdraw()` — onlyIssuer, withdraws accumulated AVAX from token sales

**Events:**
- `TokensRetired(address indexed by, uint256 amount, uint256 timestamp)`
- `EvidenceUpdated(string newURI, uint256 timestamp)`
- `PriceUpdated(uint256 newPrice)`

**Modifiers:**
- `onlyIssuer` — restricts to issuer address

---

### 2. CarbonMarketplace.sol
A factory and registry contract that deploys and tracks all CarbonToken 
contracts.

**State variables:**
- `address public admin` — platform admin (can verify projects)
- `address[] public allProjects` — array of all deployed token contracts
- `mapping(address => address[]) public issuerProjects` 
  — projects per issuer
- `mapping(address => bool) public verifiedProjects` 
  — verification registry
- `uint256 public platformFeeBps` — platform fee in basis points (e.g. 250 = 2.5%)
- `address public feeRecipient` — where platform fees go

**Functions:**
- `createProject(string name, string symbol, string projectName, 
  string projectType, string country, string evidenceURI, 
  uint256 pricePerToken, uint256 initialSupply) returns (address)`
  — deploys new CarbonToken, registers it, emits `ProjectCreated`
  
- `buyTokens(address projectToken, uint256 amount) payable`
  — validates project is verified
  — validates msg.value == amount * pricePerToken + platform fee
  — transfers AVAX to token contract (minus platform fee)
  — transfers ERC-20 tokens from issuer to buyer
  — emits `TokensPurchased`
  — IMPORTANT: use checks-effects-interactions pattern to prevent 
    reentrancy. Add ReentrancyGuard from OpenZeppelin.

- `verifyProject(address projectToken)` — onlyAdmin
- `revokeVerification(address projectToken)` — onlyAdmin
- `updatePlatformFee(uint256 newFeeBps)` — onlyAdmin, max 1000 bps (10%)
- `getProjectDetails(address projectToken) returns (struct)`
  — returns all metadata from a CarbonToken in a single call
- `getAllProjects() returns (address[])`
- `getIssuerProjects(address issuer) returns (address[])`

**Events:**
- `ProjectCreated(address indexed issuer, address indexed tokenContract, 
  string projectName, uint256 timestamp)`
- `TokensPurchased(address indexed buyer, address indexed project, 
  uint256 amount, uint256 avaxPaid, uint256 timestamp)`
- `ProjectVerified(address indexed project, uint256 timestamp)`
- `ProjectRevoked(address indexed project, uint256 timestamp)`

---

## SECURITY REQUIREMENTS

Apply all of these — no exceptions:

- Import and use `@openzeppelin/contracts` for:
  - `ERC20` (base token)
  - `ReentrancyGuard` (on all payable functions)
  - `Ownable` (for admin functions)
- CEI pattern (Checks → Effects → Interactions) on every state-changing 
  function
- No unchecked arithmetic (Solidity ^0.8.x handles this natively)
- `pricePerToken` must be > 0 on creation
- `initialSupply` must be > 0 on creation
- `platformFeeBps` must never exceed 1000 (10%)
- Add `receive()` fallback on marketplace to reject accidental AVAX sends
- Validate all address params are not address(0)
- Use `pull payment pattern` for AVAX withdrawals — never push to 
  arbitrary addresses in the same tx as token logic

---

## DEPLOYMENT & TOOLING

- Solidity version: `^0.8.20`
- Target network: Avalanche C-Chain
  - Mainnet RPC: `https://api.avax.network/ext/bc/C/rpc`
  - Testnet (Fuji) RPC: `https://api.avax-test.network/ext/bc/C/rpc`
  - Chain ID mainnet: 43114
  - Chain ID testnet (Fuji): 43113
  - Native currency: AVAX (not ETH — update all comments and 
    variable names accordingly)
- Use Hardhat for the development environment
- Provide a complete `hardhat.config.ts` configured for both 
  Fuji testnet and Avalanche mainnet
- Use `dotenv` for private key and RPC URL management

---

## DELIVERABLES

Provide all of the following:

1. `contracts/CarbonToken.sol` — full implementation
2. `contracts/CarbonMarketplace.sol` — full implementation
3. `hardhat.config.ts` — configured for Avalanche Fuji + mainnet
4. `scripts/deploy.ts` — deployment script that:
   - Deploys CarbonMarketplace
   - Deploys one example CarbonToken via createProject()
   - Logs all contract addresses
   - Verifies on Snowtrace (Avalanche's block explorer)
5. `test/CarbonMarketplace.test.ts` — test suite covering:
   - Project creation
   - Buying tokens with correct AVAX amount
   - Buying tokens with incorrect AVAX (should revert)
   - Admin verification flow
   - Retirement/burn flow
   - Platform fee calculation
   - Reentrancy attack attempt (should revert)
6. `README.md` with:
   - Architecture diagram in ASCII
   - How to deploy to Fuji testnet step by step
   - How to get Fuji test AVAX from the faucet
   - ABI summary for frontend integration

---

## FRONTEND INTEGRATION NOTES

After delivering the contracts, provide a brief `integration.md` 
showing how to call the key functions from a Next.js frontend using 
ethers.js v6:
- How to connect to Avalanche C-Chain
- How to call `buyTokens()` with correct AVAX value
- How to listen to `TokensPurchased` events in real time
- How to read `evidenceURI` and display project metadata
- How to call `retire()` and show the user their offset certificate data

---

## IMPORTANT NOTES

- This is for Avalanche C-Chain, which is EVM-compatible but uses AVAX 
  as the native gas and payment token — never refer to it as ETH in 
  the code or comments
- The `buyTokens` flow assumes the issuer has pre-approved the 
  marketplace contract to transfer tokens on their behalf via 
  `ERC20.approve()` — document this clearly and include the approval 
  step in the deploy script and README
- Prioritize readability: add NatSpec comments (@notice, @param, 
  @return) on every public function