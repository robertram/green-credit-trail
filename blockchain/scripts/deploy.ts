import { ethers, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "AVAX"
  );

  // ── 1. Deploy CarbonMarketplace ───────────────────────────────────────────
  const platformFeeBps = 250; // 2.5%
  const feeRecipient = deployer.address; // change to a dedicated treasury address

  const MarketplaceFactory = await ethers.getContractFactory("CarbonMarketplace");
  const marketplace = await MarketplaceFactory.deploy(platformFeeBps, feeRecipient);
  await marketplace.waitForDeployment();

  const marketplaceAddress = await marketplace.getAddress();
  console.log("\n✅ CarbonMarketplace deployed at:", marketplaceAddress);

  // ── 2. Create an example project via the marketplace ─────────────────────
  // Price: 0.01 AVAX per token | Supply: 10,000 tokens
  const pricePerToken = ethers.parseEther("0.01");
  const initialSupply = 10_000n;

  const tx = await marketplace.createProject(
    "Monteverde Carbon",    // ERC-20 name
    "MVC",                  // ERC-20 symbol
    "Bosque Nuboso Monteverde",
    "Reforestation",
    "Costa Rica",
    "ipfs://QmExampleHashReplaceMeWithRealIPFSHash",
    pricePerToken,
    initialSupply
  );
  const receipt = await tx.wait();

  // Parse the ProjectCreated event to get the token address
  const event = receipt?.logs
    .map((log: { topics: string[]; data: string }) => {
      try {
        return marketplace.interface.parseLog(log as { topics: string[]; data: string });
      } catch {
        return null;
      }
    })
    .find((e: { name: string } | null) => e?.name === "ProjectCreated");

  const tokenAddress: string = event?.args?.tokenContract ?? "";
  console.log("✅ Example CarbonToken deployed at:", tokenAddress);

  // ── 3. Issuer must approve the marketplace to transfer tokens on their behalf
  //    In production this is called by the issuer's wallet — shown here for demo.
  const CarbonTokenFactory = await ethers.getContractFactory("CarbonToken");
  const carbonToken = CarbonTokenFactory.attach(tokenAddress);
  const approveTx = await (carbonToken as any).approve(marketplaceAddress, initialSupply);
  await approveTx.wait();
  console.log(
    `✅ Issuer approved marketplace to transfer ${initialSupply} MVC tokens`
  );

  // ── 4. Admin verifies the project ─────────────────────────────────────────
  const verifyTx = await marketplace.verifyProject(tokenAddress);
  await verifyTx.wait();
  console.log("✅ Project verified by admin");

  // ── 5. Verify contracts on Snowtrace (skip on local networks) ─────────────
  const networkName = (await ethers.provider.getNetwork()).name;
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\nWaiting 30s for Snowtrace to index blocks...");
    await new Promise((r) => setTimeout(r, 30_000));

    console.log("Verifying CarbonMarketplace on Snowtrace...");
    await run("verify:verify", {
      address: marketplaceAddress,
      constructorArguments: [platformFeeBps, feeRecipient],
    });

    console.log("Verifying CarbonToken on Snowtrace...");
    await run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [
        "Monteverde Carbon",
        "MVC",
        "Bosque Nuboso Monteverde",
        "Reforestation",
        "Costa Rica",
        "ipfs://QmExampleHashReplaceMeWithRealIPFSHash",
        deployer.address,  // issuerAddress
        pricePerToken,
        initialSupply,
      ],
    });
  }

  console.log("\n── Deployment Summary ──────────────────────────────");
  console.log("CarbonMarketplace :", marketplaceAddress);
  console.log("CarbonToken (MVC) :", tokenAddress);
  console.log("Platform fee      :", platformFeeBps / 100, "%");
  console.log("Token price       :", ethers.formatEther(pricePerToken), "AVAX");
  console.log("Initial supply    :", initialSupply.toString(), "MVC");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
