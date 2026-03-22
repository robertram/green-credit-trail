import { useApp } from "@/context/AppContext";
import { Wallet } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { walletConnected } = useApp();

  if (walletConnected) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Wallet className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground max-w-md">Connect your Avalanche wallet to access this section.</p>
      </div>
      <ConnectButton />
    </div>
  );
}
