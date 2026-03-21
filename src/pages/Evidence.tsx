import { useParams, Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, MapPin, Trees, Car, Copy, ExternalLink, Share2, Leaf, FileText, Image, Globe } from "lucide-react";
import { toast } from "sonner";

const Evidence = () => {
  const { projectId } = useParams();
  const { getProject, getTransactions, truncateAddress } = useApp();
  const project = getProject(projectId || "");

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-xl font-bold">Project Not Found</h2>
        <Button asChild variant="outline"><Link to="/marketplace">Back to Marketplace</Link></Button>
      </div>
    );
  }

  const transactions = getTransactions(project.id);
  const available = project.tokensMinted - project.tokensSold;
  const treesEquiv = project.tokensMinted * 45;
  const carsEquiv = Math.round(project.tokensMinted / 4.6);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const contractAddress = project.issuerAddress;
  const blockNumber = 18000000 + Math.floor(Math.random() * 1000000);

  const checks = [
    { done: true, label: "Photo evidence uploaded" },
    { done: true, label: "GPS coordinates recorded" },
    { done: true, label: "Document submitted" },
    { done: project.status === "Verified", label: "Independent audit", pending: project.status !== "Verified" },
    { done: project.status === "Verified", label: "Registered on Avalanche" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <StatusBadge status={project.status} size="lg" />
            </div>
            <p className="text-muted-foreground mb-1">{project.countryFlag} {project.country} · {project.type}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.coordinates}</p>
            <p className="text-sm text-muted-foreground mt-1">Last verified: {project.dateIssued}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { copyToClipboard(window.location.href); }}>
              <Copy className="w-3.5 h-3.5 mr-1.5" />Copy Link
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}>
              <Share2 className="w-3.5 h-3.5 mr-1.5" />LinkedIn
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=Verified carbon credit project: ${project.name}`, '_blank')}>
              𝕏
            </Button>
          </div>
        </div>
        <p className="text-sm mt-4 text-muted-foreground leading-relaxed">{project.description}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Evidence Gallery */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Image className="w-4 h-4 text-primary" />Evidence Gallery</h2>
            <div className="bg-muted/30 rounded-lg h-48 flex items-center justify-center mb-3">
              {project.photoUrl ? (
                <img src={project.photoUrl} alt="Project evidence" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Image className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Geotagged field photo</p>
                  <p className="text-xs">(Placeholder — actual field photos are stored on-chain)</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-muted/30 rounded-lg p-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">{project.pdfName || "verification_report.pdf"}</p>
                  <p className="text-xs text-muted-foreground">Uploaded {project.dateIssued} · 2.4 MB</p>
                </div>
              </div>
              {project.satelliteUrl && (
                <div className="flex-1 bg-muted/30 rounded-lg p-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium">Satellite imagery</p>
                    <a href={project.satelliteUrl} className="text-xs text-primary hover:underline" target="_blank">View image</a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-5 border-b"><h2 className="font-semibold">Transaction History</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">From</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">To</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Tokens</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">TX Hash</th>
                </tr></thead>
                <tbody>{transactions.map(tx => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tx.type === 'mint' ? 'bg-primary/10 text-primary' : tx.type === 'buy' ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>{tx.type}</span></td>
                    <td className="p-3 font-mono text-xs">{truncateAddress(tx.from)}</td>
                    <td className="p-3 font-mono text-xs">{truncateAddress(tx.to)}</td>
                    <td className="p-3 text-right">{tx.tokens.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{tx.date}</td>
                    <td className="p-3 font-mono text-xs">{truncateAddress(tx.txHash)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Verification Checklist */}
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-4">Verification Checklist</h2>
            <div className="space-y-3">
              {checks.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {c.done ? (
                    <CheckCircle className="w-4.5 h-4.5 text-success flex-shrink-0" />
                  ) : c.pending ? (
                    <Clock className="w-4.5 h-4.5 text-warning flex-shrink-0" />
                  ) : (
                    <div className="w-4.5 h-4.5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${c.done ? '' : 'text-muted-foreground'}`}>
                    {c.label}{c.pending ? " — In progress" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* On-chain data */}
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-4">On-Chain Data</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: "Contract", value: truncateAddress(contractAddress), full: contractAddress },
                { label: "Tokens Minted", value: project.tokensMinted.toLocaleString() },
                { label: "Tokens Sold", value: project.tokensSold.toLocaleString() },
                { label: "Available", value: available.toLocaleString() },
                { label: "Standard", value: "ERC-20" },
                { label: "Network", value: "Avalanche (simulated)" },
                { label: "Block #", value: blockNumber.toLocaleString() },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">{item.value}</span>
                    {item.full && (
                      <button onClick={() => copyToClipboard(item.full!)} className="text-muted-foreground hover:text-foreground">
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <a href="#" className="text-xs text-primary hover:underline flex items-center gap-1 mt-3">
              <ExternalLink className="w-3 h-3" />View on Snowtrace (simulated)
            </a>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="CO₂ Represented" value={`${project.tokensMinted.toLocaleString()} tCO₂`} icon={<Leaf className="w-5 h-5" />} />
        <StatCard label="Equivalent Trees" value={treesEquiv.toLocaleString()} icon={<Trees className="w-5 h-5" />} sub="Based on 45 trees per tCO₂" />
        <StatCard label="Cars Removed (1 year)" value={carsEquiv.toLocaleString()} icon={<Car className="w-5 h-5" />} sub="Based on 4.6 tCO₂ per car/year" />
      </div>
    </div>
  );
};

export default Evidence;
