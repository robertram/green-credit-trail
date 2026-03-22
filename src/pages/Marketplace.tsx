import { useState, useMemo } from "react";
import { useApp, CarbonProject } from "@/context/AppContext";
import { WalletGuard } from "@/components/WalletGuard";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Sun, Wind, TreePine, Search, Loader2, CheckCircle, ShoppingCart, Globe, DollarSign, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const typeIcons: Record<string, typeof Leaf> = {
  Reforestation: TreePine, "Solar Energy": Sun, "Wind Energy": Wind, Mangrove: Leaf, Other: Globe,
};

const purchaseChartData = [
  { month: "Oct", co2: 800 }, { month: "Nov", co2: 1500 }, { month: "Dec", co2: 2200 },
  { month: "Jan", co2: 1800 }, { month: "Feb", co2: 3100 }, { month: "Mar", co2: 2600 },
];

const Marketplace = () => {
  const { projects, purchases, buyTokens, truncateAddress } = useApp();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("price-asc");
  const [buyModal, setBuyModal] = useState<CarbonProject | null>(null);
  const [buyAmount, setBuyAmount] = useState(1);
  const [buying, setBuying] = useState(false);

  const filtered = useMemo(() => {
    let list = projects.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.country.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sort === "price-asc") return a.pricePerToken - b.pricePerToken;
      if (sort === "price-desc") return b.pricePerToken - a.pricePerToken;
      return 0;
    });
    return list;
  }, [projects, search, typeFilter, sort]);

  const totalAvailable = projects.reduce((s, p) => s + (p.tokensMinted - p.tokensSold), 0);
  const avgPrice = Math.round(projects.reduce((s, p) => s + p.pricePerToken, 0) / projects.length);
  const totalRetired = projects.reduce((s, p) => s + p.tokensSold, 0);

  const handleBuy = async () => {
    if (!buyModal) return;
    setBuying(true);
    try {
      const txHash = await buyTokens(buyModal.id, buyAmount);
      toast.success("Purchase successful!", {
        description: txHash,
        action: {
          label: "View on Snowtrace",
          onClick: () => window.open(`https://testnet.snowtrace.io/tx/${txHash}`, "_blank"),
        },
      });
      setBuyModal(null);
      setBuyAmount(1);
    } catch { toast.error("Purchase failed"); }
    setBuying(false);
  };

  const totalOffset = purchases.reduce((s, p) => s + p.tokens, 0);

  return (
    <WalletGuard>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Carbon Credit Marketplace</h1>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Browse Credits</TabsTrigger>
            <TabsTrigger value="purchases">My Purchases</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6 mt-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Available Credits" value={totalAvailable.toLocaleString()} icon={<Leaf className="w-5 h-5" />} />
              <StatCard label="Avg Price/ton" value={`$${avgPrice}`} icon={<DollarSign className="w-5 h-5" />} />
              <StatCard label="CO₂ Retired" value={`${totalRetired.toLocaleString()} tCO₂`} icon={<Globe className="w-5 h-5" />} />
              <StatCard label="Active Projects" value={projects.length} icon={<BarChart3 className="w-5 h-5" />} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by project or country..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Reforestation">Reforestation</SelectItem>
                  <SelectItem value="Solar Energy">Solar Energy</SelectItem>
                  <SelectItem value="Wind Energy">Wind Energy</SelectItem>
                  <SelectItem value="Mangrove">Mangrove</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-asc">Price ↑</SelectItem>
                  <SelectItem value="price-desc">Price ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project Cards */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(project => {
                const Icon = typeIcons[project.type] || Leaf;
                const available = project.tokensMinted - project.tokensSold;
                const pctSold = Math.round((project.tokensSold / project.tokensMinted) * 100);
                return (
                  <div key={project.id} className="bg-card border rounded-lg p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight">{project.name}</h3>
                          <p className="text-xs text-muted-foreground">{project.countryFlag} {project.country}</p>
                        </div>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">CO₂/token</span><span className="text-right font-medium">1 tCO₂</span>
                      <span className="text-muted-foreground">Price</span><span className="text-right font-medium">${project.pricePerToken}/ton</span>
                      <span className="text-muted-foreground">Available</span><span className="text-right font-medium">{available.toLocaleString()}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{pctSold}% sold</span>
                        <span>{project.tokensSold.toLocaleString()} / {project.tokensMinted.toLocaleString()}</span>
                      </div>
                      <Progress value={pctSold} className="h-1.5" />
                    </div>
                    <Button size="sm" onClick={() => { setBuyModal(project); setBuyAmount(1); }} disabled={available === 0} className="bg-primary text-primary-foreground hover:bg-primary/90 mt-auto">
                      <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />{available === 0 ? "Sold Out" : "Buy Tokens"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <StatCard label="Total CO₂ Offset" value={`${totalOffset.toLocaleString()} tCO₂`} icon={<Globe className="w-5 h-5" />} />
              <StatCard label="Total Invested" value={`$${purchases.reduce((s, p) => s + p.totalPaid, 0).toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} />
              <StatCard label="Purchases" value={purchases.length} icon={<ShoppingCart className="w-5 h-5" />} />
            </div>

            {purchases.length > 0 ? (
              <div className="bg-card border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Tokens</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total Paid</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">TX Hash</th>
                    </tr></thead>
                    <tbody>{purchases.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 font-medium">{p.projectName}</td>
                        <td className="p-3 text-right">{p.tokens}</td>
                        <td className="p-3 text-right">${p.totalPaid.toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground">{p.date}</td>
                        <td className="p-3 font-mono text-xs">{truncateAddress(p.txHash)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No purchases yet. Browse the marketplace to get started.</p>
              </div>
            )}

            <div className="bg-card border rounded-lg p-5">
              <h2 className="font-semibold mb-4">CO₂ Offset Per Month</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={purchaseChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="co2" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Button onClick={() => toast.success("Offset certificate generated!", { description: "Your certificate has been prepared for download." })} variant="outline">
              Download Offset Certificate
            </Button>
          </TabsContent>
        </Tabs>

        {/* Buy Modal */}
        <Dialog open={!!buyModal} onOpenChange={() => setBuyModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Buy Carbon Credits</DialogTitle></DialogHeader>
            {buyModal && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{buyModal.name}</h3>
                  <p className="text-sm text-muted-foreground">{buyModal.countryFlag} {buyModal.country} · {buyModal.type}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Price per token</span><span className="font-medium">${buyModal.pricePerToken}</span>
                  <span className="text-muted-foreground">Available</span><span className="font-medium">{(buyModal.tokensMinted - buyModal.tokensSold).toLocaleString()}</span>
                </div>
                <div>
                  <label className="text-sm font-medium">Number of tokens</label>
                  <Input type="number" min={1} max={buyModal.tokensMinted - buyModal.tokensSold} value={buyAmount} onChange={e => setBuyAmount(Number(e.target.value))} className="mt-1" />
                </div>
                <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm font-medium">Total Cost</span>
                  <span className="text-lg font-bold">${(buyAmount * buyModal.pricePerToken).toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleBuy} disabled={buying || buyAmount < 1} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    {buying ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : <><CheckCircle className="w-4 h-4 mr-2" />Confirm Purchase</>}
                  </Button>
                  <Button variant="outline" asChild><Link to={`/evidence/${buyModal.id}`}>View Evidence</Link></Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </WalletGuard>
  );
};

export default Marketplace;
