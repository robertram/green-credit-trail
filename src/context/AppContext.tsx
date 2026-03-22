import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
import {
  useAccount,
  useDisconnect,
  useReadContract,
  useReadContracts,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther, parseAbiItem } from "viem";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, CARBON_TOKEN_ABI } from "@/lib/contracts";
import { encodeMetadata, decodeMetadata } from "@/lib/metadata";

export type ProjectType = "Reforestation" | "Solar Energy" | "Wind Energy" | "Mangrove" | "Other";
export type VerificationStatus = "Verified" | "Pending" | "Retired";

export interface CarbonProject {
  id: string;
  name: string;
  type: ProjectType;
  country: string;
  countryFlag: string;
  description: string;
  tokensMinted: number;
  tokensSold: number;
  pricePerToken: number;
  status: VerificationStatus;
  dateIssued: string;
  coordinates: string;
  photoUrl?: string;
  pdfName?: string;
  satelliteUrl?: string;
  issuerAddress: string;
}

export interface Purchase {
  id: string;
  projectId: string;
  projectName: string;
  tokens: number;
  totalPaid: number;
  date: string;
  txHash: string;
  buyerAddress: string;
}

export interface Transaction {
  id: string;
  projectId: string;
  type: "mint" | "buy" | "retire";
  from: string;
  to: string;
  tokens: number;
  date: string;
  txHash: string;
}

const generateTxHash = () => {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
};

const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface AppContextType {
  walletConnected: boolean;
  walletAddress: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  projects: CarbonProject[];
  addProject: (p: Omit<CarbonProject, "id" | "tokensSold" | "status" | "dateIssued" | "issuerAddress">) => Promise<string>;
  purchases: Purchase[];
  buyTokens: (projectId: string, amount: number) => Promise<string>;
  getProject: (id: string) => CarbonProject | undefined;
  getTransactions: (projectId: string) => Promise<Transaction[]>;
  truncateAddress: (addr: string) => string;
  generateTxHash: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const publicClient = usePublicClient();

  const walletConnected = isConnected;
  const walletAddress = address ?? "";

  const contractEnabled = MARKETPLACE_ADDRESS !== "0x";

  // ── Read all project addresses ──────────────────────────────────────────────
  const { data: projectAddresses } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getAllProjects",
    query: { enabled: contractEnabled },
  });

  // ── Batch read project details ──────────────────────────────────────────────
  const detailsContracts = useMemo(
    () =>
      (projectAddresses ?? []).map((addr) => ({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: "getProjectDetails" as const,
        args: [addr as `0x${string}`],
      })),
    [projectAddresses],
  );

  const { data: detailsResults } = useReadContracts({
    contracts: detailsContracts,
    query: { enabled: detailsContracts.length > 0 },
  });

  // ── Batch read issuer balances (one per project) ────────────────────────────
  const balanceContracts = useMemo(() => {
    if (!projectAddresses || !detailsResults) return [];
    return projectAddresses.map((addr, i) => {
      const r = detailsResults[i];
      const issuer =
        r?.status === "success"
          ? ((r.result as unknown[])[4] as `0x${string}`)
          : (ZERO_ADDRESS as `0x${string}`);
      return {
        address: addr as `0x${string}`,
        abi: CARBON_TOKEN_ABI,
        functionName: "balanceOf" as const,
        args: [issuer],
      };
    });
  }, [projectAddresses, detailsResults]);

  const { data: balanceResults } = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: balanceContracts.length > 0 },
  });

  // ── Read platform fee ───────────────────────────────────────────────────────
  const { data: platformFeeBps } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "platformFeeBps",
    query: { enabled: contractEnabled },
  });

  // ── Map contract data → CarbonProject[] ────────────────────────────────────
  const projects = useMemo((): CarbonProject[] => {
    if (!projectAddresses || !detailsResults) return [];
    return projectAddresses
      .map((addr, i) => {
        const r = detailsResults[i];
        if (!r || r.status !== "success") return null;
        const [
          name,
          type,
          country,
          evidenceURI,
          issuer,
          price,
          verified,
          totalSupply,
          totalRetired,
        ] = r.result as [
          string,
          string,
          string,
          string,
          string,
          bigint,
          boolean,
          bigint,
          bigint,
        ];
        const issuerBalance =
          balanceResults?.[i]?.status === "success"
            ? (balanceResults[i].result as bigint)
            : 0n;
        const metadata = decodeMetadata(evidenceURI);
        // tokensMinted = current supply + already retired (original issuance)
        const tokensMinted = Number(totalSupply) + Number(totalRetired);
        // tokensSold = tokens no longer in issuer's wallet (held by buyers or retired)
        const tokensSold = Math.max(0, Number(totalSupply) - Number(issuerBalance));
        return {
          id: addr,
          name,
          type: type as ProjectType,
          country,
          countryFlag: metadata.countryFlag ?? "",
          description: metadata.description ?? "",
          tokensMinted,
          tokensSold,
          pricePerToken: Number(formatEther(price)),
          status: verified ? ("Verified" as VerificationStatus) : ("Pending" as VerificationStatus),
          dateIssued: metadata.dateIssued ?? "",
          coordinates: metadata.coordinates ?? "",
          photoUrl: metadata.photoUrl,
          pdfName: metadata.pdfName,
          satelliteUrl: metadata.satelliteUrl,
          issuerAddress: issuer,
        } satisfies CarbonProject;
      })
      .filter((p): p is CarbonProject => p !== null);
  }, [projectAddresses, detailsResults, balanceResults]);

  // ── Write contract ──────────────────────────────────────────────────────────
  const { writeContractAsync } = useWriteContract();

  const connectWallet = async () => {
    openConnectModal?.();
  };

  const disconnectWallet = () => {
    disconnect();
  };

  const addProject = async (
    p: Omit<CarbonProject, "id" | "tokensSold" | "status" | "dateIssued" | "issuerAddress">,
  ) => {
    const metadata = encodeMetadata({
      description: p.description,
      coordinates: p.coordinates,
      countryFlag: p.countryFlag,
      photoUrl: p.photoUrl,
      pdfName: p.pdfName,
      satelliteUrl: p.satelliteUrl,
      dateIssued: new Date().toISOString().split("T")[0],
    });
    const symbol =
      p.name
        .replace(/[^A-Za-z0-9]/g, "")
        .substring(0, 6)
        .toUpperCase() || "CCT";
    const priceWei = parseEther(p.pricePerToken.toString());
    const txHash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "createProject",
      args: [
        `${p.name} Token`,
        symbol,
        p.name,
        p.type,
        p.country,
        metadata,
        priceWei,
        BigInt(p.tokensMinted),
      ],
    });
    return txHash;
  };

  // ── Purchases: load history + watch new ────────────────────────────────────
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    if (!publicClient || !address || !contractEnabled) return;
    const load = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: MARKETPLACE_ADDRESS,
          event: parseAbiItem(
            "event TokensPurchased(address indexed buyer, address indexed project, uint256 amount, uint256 avaxPaid, uint256 timestamp)",
          ),
          args: { buyer: address },
          fromBlock: 0n,
        });
        const historical: Purchase[] = logs.map((log) => {
          const projectAddr = (log.args.project ?? ZERO_ADDRESS) as string;
          const proj = projects.find(
            (p) => p.id.toLowerCase() === projectAddr.toLowerCase(),
          );
          return {
            id: log.transactionHash ?? `purchase-${log.logIndex}`,
            projectId: projectAddr,
            projectName: proj?.name ?? truncateAddress(projectAddr),
            tokens: Number(log.args.amount ?? 0n),
            totalPaid: Number(formatEther(log.args.avaxPaid ?? 0n)),
            date: new Date(Number(log.args.timestamp ?? 0n) * 1000)
              .toISOString()
              .split("T")[0],
            txHash: log.transactionHash ?? "",
            buyerAddress: address,
          };
        });
        setPurchases(historical);
      } catch (err) {
        console.error("Failed to load purchase history:", err);
      }
    };
    load();
  }, [address, publicClient, contractEnabled, projects]);

  const buyTokens = async (projectId: string, amount: number) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new Error("Project not found");
    const feeBps = platformFeeBps ?? 0n;
    const priceWei = parseEther(project.pricePerToken.toString());
    const totalCost = priceWei * BigInt(amount);
    const feeAmount = (totalCost * feeBps) / 10000n;
    const totalValue = totalCost + feeAmount;
    const txHash = await writeContractAsync({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "buyTokens",
      args: [projectId as `0x${string}`, BigInt(amount)],
      value: totalValue,
    });
    // Optimistically add to purchases until next history reload
    setPurchases((prev) => [
      ...prev,
      {
        id: txHash,
        projectId,
        projectName: project.name,
        tokens: amount,
        totalPaid: Number(formatEther(totalValue)),
        date: new Date().toISOString().split("T")[0],
        txHash,
        buyerAddress: walletAddress,
      },
    ]);
    return txHash;
  };

  // ── Project lookup ──────────────────────────────────────────────────────────
  const getProject = (id: string) => projects.find((p) => p.id === id);

  // ── Transaction history from Transfer events ────────────────────────────────
  const getTransactions = async (projectId: string): Promise<Transaction[]> => {
    if (!publicClient || !projectId || !projectId.startsWith("0x")) return [];
    try {
      const logs = await publicClient.getLogs({
        address: projectId as `0x${string}`,
        event: parseAbiItem(
          "event Transfer(address indexed from, address indexed to, uint256 value)",
        ),
        fromBlock: 0n,
      });
      return logs.map((log) => {
        const from = (log.args.from ?? ZERO_ADDRESS) as string;
        const to = (log.args.to ?? ZERO_ADDRESS) as string;
        let type: "mint" | "buy" | "retire" = "buy";
        if (from === ZERO_ADDRESS) type = "mint";
        else if (to === ZERO_ADDRESS) type = "retire";
        return {
          id: `${log.transactionHash}-${log.logIndex}`,
          projectId,
          type,
          from,
          to,
          tokens: Number(log.args.value ?? 0n),
          date: "on-chain",
          txHash: log.transactionHash ?? "",
        };
      });
    } catch (err) {
      console.error("Failed to load transactions:", err);
      return [];
    }
  };

  return (
    <AppContext.Provider
      value={{
        walletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
        projects,
        addProject,
        purchases,
        buyTokens,
        getProject,
        getTransactions,
        truncateAddress,
        generateTxHash,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
