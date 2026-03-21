import React, { createContext, useContext, useState, ReactNode } from "react";

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

const generateAddress = () => {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * 16)];
  return addr;
};

const generateTxHash = () => {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
};

const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const MOCK_PROJECTS: CarbonProject[] = [
  {
    id: "proj-001", name: "Bosque Nuboso Monteverde", type: "Reforestation", country: "Costa Rica", countryFlag: "🇨🇷",
    description: "Cloud forest conservation and reforestation project protecting 2,500 hectares of primary and secondary cloud forest in the Tilarán mountain range.",
    tokensMinted: 12000, tokensSold: 8400, pricePerToken: 32, status: "Verified", dateIssued: "2025-09-15",
    coordinates: "10.3025° N, 84.8250° W", issuerAddress: generateAddress(),
  },
  {
    id: "proj-002", name: "Amazônia Restaurada", type: "Reforestation", country: "Brazil", countryFlag: "🇧🇷",
    description: "Large-scale reforestation of degraded pastureland in the Amazon basin, planting native species across 5,000 hectares of previously deforested areas.",
    tokensMinted: 25000, tokensSold: 18750, pricePerToken: 28, status: "Verified", dateIssued: "2025-06-20",
    coordinates: "3.4653° S, 62.2159° W", issuerAddress: generateAddress(),
  },
  {
    id: "proj-003", name: "Sol del Caribe", type: "Solar Energy", country: "Colombia", countryFlag: "🇨🇴",
    description: "120MW solar photovoltaic installation in La Guajira department, displacing fossil fuel generation and providing clean energy to 45,000 households.",
    tokensMinted: 8500, tokensSold: 5100, pricePerToken: 22, status: "Verified", dateIssued: "2025-08-10",
    coordinates: "11.5444° N, 72.9072° W", issuerAddress: generateAddress(),
  },
  {
    id: "proj-004", name: "Manglar de Tumbes", type: "Mangrove", country: "Peru", countryFlag: "🇵🇪",
    description: "Restoration of degraded mangrove ecosystems in the Tumbes region, recovering 800 hectares of critical coastal habitat and blue carbon sinks.",
    tokensMinted: 6000, tokensSold: 3000, pricePerToken: 45, status: "Verified", dateIssued: "2025-07-05",
    coordinates: "3.5706° S, 80.4515° W", issuerAddress: generateAddress(),
  },
  {
    id: "proj-005", name: "Eólica Sierra Norte", type: "Wind Energy", country: "Mexico", countryFlag: "🇲🇽",
    description: "85MW wind farm in the Sierra Norte region of Oaxaca, generating clean electricity and supporting local indigenous communities.",
    tokensMinted: 10000, tokensSold: 7500, pricePerToken: 18, status: "Verified", dateIssued: "2025-10-01",
    coordinates: "17.0732° N, 96.7266° W", issuerAddress: generateAddress(),
  },
  {
    id: "proj-006", name: "Proyecto Verde Cauca", type: "Reforestation", country: "Colombia", countryFlag: "🇨🇴",
    description: "Community-led reforestation initiative in the Cauca Valley region. Currently pending independent verification audit.",
    tokensMinted: 3000, tokensSold: 0, pricePerToken: 15, status: "Pending", dateIssued: "2026-01-15",
    coordinates: "2.4419° N, 76.6063° W", issuerAddress: generateAddress(),
  },
];

const generateMockTransactions = (project: CarbonProject): Transaction[] => {
  const txs: Transaction[] = [
    { id: `tx-${project.id}-mint`, projectId: project.id, type: "mint", from: "0x0000000000000000000000000000000000000000", to: project.issuerAddress, tokens: project.tokensMinted, date: project.dateIssued, txHash: generateTxHash() },
  ];
  const buyers = 5 + Math.floor(Math.random() * 5);
  let sold = 0;
  for (let i = 0; i < buyers && sold < project.tokensSold; i++) {
    const amt = Math.min(Math.floor(Math.random() * 500) + 50, project.tokensSold - sold);
    sold += amt;
    const d = new Date(project.dateIssued);
    d.setDate(d.getDate() + Math.floor(Math.random() * 180));
    txs.push({ id: `tx-${project.id}-buy-${i}`, projectId: project.id, type: "buy", from: project.issuerAddress, to: generateAddress(), tokens: amt, date: d.toISOString().split("T")[0], txHash: generateTxHash() });
  }
  return txs;
};

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
  getTransactions: (projectId: string) => Transaction[];
  truncateAddress: (addr: string) => string;
  generateTxHash: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [projects, setProjects] = useState<CarbonProject[]>(MOCK_PROJECTS);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [txCache] = useState<Map<string, Transaction[]>>(new Map());

  const connectWallet = async () => {
    await new Promise(r => setTimeout(r, 1500));
    setWalletAddress(generateAddress());
    setWalletConnected(true);
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
  };

  const addProject = async (p: Omit<CarbonProject, "id" | "tokensSold" | "status" | "dateIssued" | "issuerAddress">) => {
    await new Promise(r => setTimeout(r, 2000));
    const id = `proj-${Date.now()}`;
    const newProject: CarbonProject = {
      ...p, id, tokensSold: 0, status: "Pending",
      dateIssued: new Date().toISOString().split("T")[0],
      issuerAddress: walletAddress,
    };
    setProjects(prev => [...prev, newProject]);
    return generateTxHash();
  };

  const buyTokens = async (projectId: string, amount: number) => {
    await new Promise(r => setTimeout(r, 2000));
    const txHash = generateTxHash();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error("Project not found");
    
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tokensSold: p.tokensSold + amount } : p));
    setPurchases(prev => [...prev, {
      id: `purchase-${Date.now()}`, projectId, projectName: project.name,
      tokens: amount, totalPaid: amount * project.pricePerToken,
      date: new Date().toISOString().split("T")[0], txHash, buyerAddress: walletAddress,
    }]);
    return txHash;
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  const getTransactions = (projectId: string) => {
    if (!txCache.has(projectId)) {
      const project = projects.find(p => p.id === projectId);
      if (project) txCache.set(projectId, generateMockTransactions(project));
    }
    return txCache.get(projectId) || [];
  };

  return (
    <AppContext.Provider value={{ walletConnected, walletAddress, connectWallet, disconnectWallet, projects, addProject, purchases, buyTokens, getProject, getTransactions, truncateAddress, generateTxHash }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
