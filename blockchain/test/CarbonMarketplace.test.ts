import { expect } from "chai";
import { ethers } from "hardhat";
import { CarbonMarketplace, CarbonToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CarbonMarketplace", () => {
  let marketplace: CarbonMarketplace;
  let admin: HardhatEthersSigner;
  let issuer: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let feeRecipient: HardhatEthersSigner;

  const PLATFORM_FEE_BPS = 250n; // 2.5%
  const PRICE_PER_TOKEN = ethers.parseEther("0.01"); // 0.01 AVAX
  const INITIAL_SUPPLY = 10_000n;

  beforeEach(async () => {
    [admin, issuer, buyer, attacker, feeRecipient] = await ethers.getSigners();

    const MarketplaceFactory = await ethers.getContractFactory("CarbonMarketplace", admin);
    marketplace = (await MarketplaceFactory.deploy(
      PLATFORM_FEE_BPS,
      feeRecipient.address
    )) as CarbonMarketplace;
    await marketplace.waitForDeployment();
  });

  // ── Helper: deploy a project as `issuer` and return token ─────────────────
  async function createAndVerifyProject(): Promise<CarbonToken> {
    const tx = await marketplace.connect(issuer).createProject(
      "Test Carbon",
      "TCB",
      "Test Project",
      "Reforestation",
      "Brazil",
      "ipfs://QmTest",
      PRICE_PER_TOKEN,
      INITIAL_SUPPLY
    );
    const receipt = await tx.wait();

    const event = receipt?.logs
      .map((log) => {
        try { return marketplace.interface.parseLog(log as { topics: string[]; data: string }); }
        catch { return null; }
      })
      .find((e) => e?.name === "ProjectCreated");

    const tokenAddress: string = event?.args?.tokenContract;
    const token = (await ethers.getContractAt("CarbonToken", tokenAddress, issuer)) as CarbonToken;

    // Admin verifies the project
    await marketplace.connect(admin).verifyProject(tokenAddress);

    // Issuer approves the marketplace to transfer tokens on their behalf
    await token.connect(issuer).approve(await marketplace.getAddress(), INITIAL_SUPPLY);

    return token;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Project Creation
  // ─────────────────────────────────────────────────────────────────────────

  describe("createProject", () => {
    it("deploys a new CarbonToken and registers it", async () => {
      const tx = await marketplace.connect(issuer).createProject(
        "Test Carbon", "TCB", "Test Project", "Reforestation",
        "Brazil", "ipfs://QmTest", PRICE_PER_TOKEN, INITIAL_SUPPLY
      );
      const receipt = await tx.wait();

      await expect(tx)
        .to.emit(marketplace, "ProjectCreated")
        .withArgs(
          issuer.address,
          // token address — we don't know it ahead of time, skip check
          (v: string) => ethers.isAddress(v),
          "Test Project",
          (v: bigint) => v > 0n
        );

      const projects = await marketplace.getAllProjects();
      expect(projects).to.have.length(1);

      const issuerProjects = await marketplace.getIssuerProjects(issuer.address);
      expect(issuerProjects).to.have.length(1);
    });

    it("reverts when price is 0", async () => {
      await expect(
        marketplace.connect(issuer).createProject(
          "Bad", "BAD", "Bad Project", "Solar", "US", "ipfs://bad", 0n, INITIAL_SUPPLY
        )
      ).to.be.revertedWith("CarbonMarketplace: price must be > 0");
    });

    it("reverts when initial supply is 0", async () => {
      await expect(
        marketplace.connect(issuer).createProject(
          "Bad", "BAD", "Bad Project", "Solar", "US", "ipfs://bad", PRICE_PER_TOKEN, 0n
        )
      ).to.be.revertedWith("CarbonMarketplace: supply must be > 0");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin Verification Flow
  // ─────────────────────────────────────────────────────────────────────────

  describe("verifyProject / revokeVerification", () => {
    it("admin can verify a project", async () => {
      const tx = await marketplace.connect(issuer).createProject(
        "T", "T", "T", "Solar", "US", "ipfs://t", PRICE_PER_TOKEN, INITIAL_SUPPLY
      );
      const receipt = await tx.wait();
      const tokenAddr = receipt?.logs
        .map((l) => { try { return marketplace.interface.parseLog(l as any); } catch { return null; } })
        .find((e) => e?.name === "ProjectCreated")?.args?.tokenContract;

      await expect(marketplace.connect(admin).verifyProject(tokenAddr))
        .to.emit(marketplace, "ProjectVerified");

      expect(await marketplace.verifiedProjects(tokenAddr)).to.be.true;
    });

    it("non-admin cannot verify a project", async () => {
      const tx = await marketplace.connect(issuer).createProject(
        "T", "T", "T", "Solar", "US", "ipfs://t", PRICE_PER_TOKEN, INITIAL_SUPPLY
      );
      const receipt = await tx.wait();
      const tokenAddr = receipt?.logs
        .map((l) => { try { return marketplace.interface.parseLog(l as any); } catch { return null; } })
        .find((e) => e?.name === "ProjectCreated")?.args?.tokenContract;

      await expect(marketplace.connect(attacker).verifyProject(tokenAddr))
        .to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });

    it("admin can revoke verification", async () => {
      const token = await createAndVerifyProject();
      const tokenAddr = await token.getAddress();

      await expect(marketplace.connect(admin).revokeVerification(tokenAddr))
        .to.emit(marketplace, "ProjectRevoked");

      expect(await marketplace.verifiedProjects(tokenAddr)).to.be.false;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Buying Tokens
  // ─────────────────────────────────────────────────────────────────────────

  describe("buyTokens", () => {
    it("buyer purchases tokens with correct AVAX amount", async () => {
      const token = await createAndVerifyProject();
      const tokenAddr = await token.getAddress();
      const amount = 10n;

      const totalCost = PRICE_PER_TOKEN * amount;
      const fee = (totalCost * PLATFORM_FEE_BPS) / 10_000n;
      const required = totalCost + fee;

      await expect(
        marketplace.connect(buyer).buyTokens(tokenAddr, amount, { value: required })
      )
        .to.emit(marketplace, "TokensPurchased")
        .withArgs(buyer.address, tokenAddr, amount, required, (v: bigint) => v > 0n);

      expect(await token.balanceOf(buyer.address)).to.equal(amount);
    });

    it("reverts when AVAX amount is incorrect (too low)", async () => {
      const token = await createAndVerifyProject();
      const tokenAddr = await token.getAddress();

      await expect(
        marketplace.connect(buyer).buyTokens(tokenAddr, 10n, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("CarbonMarketplace: incorrect AVAX amount");
    });

    it("reverts when AVAX amount is incorrect (too high)", async () => {
      const token = await createAndVerifyProject();
      const tokenAddr = await token.getAddress();

      await expect(
        marketplace.connect(buyer).buyTokens(tokenAddr, 10n, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("CarbonMarketplace: incorrect AVAX amount");
    });

    it("reverts when project is not verified", async () => {
      const tx = await marketplace.connect(issuer).createProject(
        "Unverified", "UV", "UV Project", "Wind", "MX", "ipfs://uv", PRICE_PER_TOKEN, INITIAL_SUPPLY
      );
      const receipt = await tx.wait();
      const tokenAddr = receipt?.logs
        .map((l) => { try { return marketplace.interface.parseLog(l as any); } catch { return null; } })
        .find((e) => e?.name === "ProjectCreated")?.args?.tokenContract;

      const totalCost = PRICE_PER_TOKEN * 5n;
      const fee = (totalCost * PLATFORM_FEE_BPS) / 10_000n;
      await expect(
        marketplace.connect(buyer).buyTokens(tokenAddr, 5n, { value: totalCost + fee })
      ).to.be.revertedWith("CarbonMarketplace: project not verified");
    });

    it("platform fee is sent to feeRecipient", async () => {
      const token = await createAndVerifyProject();
      const tokenAddr = await token.getAddress();
      const amount = 10n;

      const totalCost = PRICE_PER_TOKEN * amount;
      const fee = (totalCost * PLATFORM_FEE_BPS) / 10_000n;
      const required = totalCost + fee;

      const balanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      await marketplace.connect(buyer).buyTokens(tokenAddr, amount, { value: required });
      const balanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      expect(balanceAfter - balanceBefore).to.equal(fee);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Platform Fee Management
  // ─────────────────────────────────────────────────────────────────────────

  describe("updatePlatformFee", () => {
    it("admin can update the platform fee", async () => {
      await marketplace.connect(admin).updatePlatformFee(500n);
      expect(await marketplace.platformFeeBps()).to.equal(500n);
    });

    it("reverts when fee exceeds 10% (1000 bps)", async () => {
      await expect(
        marketplace.connect(admin).updatePlatformFee(1001n)
      ).to.be.revertedWith("CarbonMarketplace: fee exceeds 10%");
    });

    it("non-admin cannot update fee", async () => {
      await expect(
        marketplace.connect(attacker).updatePlatformFee(100n)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Retirement / Burn Flow
  // ─────────────────────────────────────────────────────────────────────────

  describe("retire (CarbonToken)", () => {
    it("buyer can retire purchased tokens", async () => {
      const token = await createAndVerifyProject();
      const tokenAddr = await token.getAddress();
      const amount = 5n;

      const totalCost = PRICE_PER_TOKEN * amount;
      const fee = (totalCost * PLATFORM_FEE_BPS) / 10_000n;
      await marketplace.connect(buyer).buyTokens(tokenAddr, amount, { value: totalCost + fee });

      await expect(token.connect(buyer).retire(amount))
        .to.emit(token, "TokensRetired")
        .withArgs(buyer.address, amount, (v: bigint) => v > 0n);

      expect(await token.balanceOf(buyer.address)).to.equal(0n);
      expect(await token.totalRetired()).to.equal(amount);
    });

    it("reverts when retiring more than balance", async () => {
      const token = await createAndVerifyProject();
      await expect(token.connect(buyer).retire(1n))
        .to.be.revertedWith("CarbonToken: insufficient balance");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Reentrancy Attack Prevention
  // ─────────────────────────────────────────────────────────────────────────

  describe("reentrancy protection", () => {
    it("rejects direct AVAX sends to marketplace", async () => {
      await expect(
        admin.sendTransaction({
          to: await marketplace.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("CarbonMarketplace: direct AVAX transfers not accepted");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // View Functions
  // ─────────────────────────────────────────────────────────────────────────

  describe("getProjectDetails", () => {
    it("returns all metadata for a project", async () => {
      const token = await createAndVerifyProject();
      const tokenAddr = await token.getAddress();

      const details = await marketplace.getProjectDetails(tokenAddr);
      expect(details.tokenProjectName).to.equal("Test Project");
      expect(details.tokenProjectType).to.equal("Reforestation");
      expect(details.tokenCountry).to.equal("Brazil");
      expect(details.tokenPrice).to.equal(PRICE_PER_TOKEN);
      expect(details.tokenVerified).to.be.true;
      expect(details.tokenTotalSupply).to.equal(INITIAL_SUPPLY);
      expect(details.tokenTotalRetired).to.equal(0n);
    });
  });
});
