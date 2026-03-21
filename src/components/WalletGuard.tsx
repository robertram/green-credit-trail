import { useApp } from "@/context/AppContext";
import { Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { walletConnected, connectWallet } = useApp();
  const [connecting, setConnecting] = useState(false);

  if (walletConnected) return <>{children}</>;

  const handleConnect = async () => {
    setConnecting(true);
    await connectWallet();
    setConnecting(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Wallet className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground max-w-md">Connect your Avalanche wallet to access this section. All transactions are simulated for demonstration purposes.</p>
      </div>
      <Button onClick={handleConnect} disabled={connecting} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
        {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
        {connecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    </div>
  );
}
