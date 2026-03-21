import { useState, FormEvent } from "react";
import { useApp, ProjectType } from "@/context/AppContext";
import { WalletGuard } from "@/components/WalletGuard";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, DollarSign, BarChart3, Loader2, CheckCircle, Upload, FileText, Link as LinkIcon, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const PROJECT_TYPES: ProjectType[] = ["Reforestation", "Solar Energy", "Wind Energy", "Mangrove", "Other"];
const COUNTRIES = ["Costa Rica", "Brazil", "Colombia", "Peru", "Mexico", "Argentina", "Chile", "Ecuador", "Bolivia", "Panama"];

const chartData = [
  { month: "Oct", tokens: 1200 }, { month: "Nov", tokens: 3400 }, { month: "Dec", tokens: 2800 },
  { month: "Jan", tokens: 4500 }, { month: "Feb", tokens: 3200 }, { month: "Mar", tokens: 5100 },
];

const Issuer = () => {
  const { projects, addProject, walletAddress } = useApp();
  const [minting, setMinting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);

  const myProjects = projects.filter(p => p.issuerAddress === walletAddress);
  const totalIssued = myProjects.reduce((s, p) => s + p.tokensMinted, 0) || projects.reduce((s, p) => s + p.tokensMinted, 0);
  const totalSold = myProjects.reduce((s, p) => s + p.tokensSold, 0) || projects.reduce((s, p) => s + p.tokensSold, 0);
  const totalRevenue = myProjects.reduce((s, p) => s + p.tokensSold * p.pricePerToken, 0) || projects.reduce((s, p) => s + p.tokensSold * p.pricePerToken, 0);
  const displayProjects = myProjects.length > 0 ? myProjects : projects;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMinting(true);
    try {
      const txHash = await addProject({
        name: fd.get("name") as string,
        type: fd.get("type") as ProjectType,
        country: fd.get("country") as string,
        countryFlag: "",
        description: fd.get("description") as string,
        tokensMinted: Number(fd.get("tokens")),
        pricePerToken: Number(fd.get("price")),
        coordinates: "0° N, 0° W",
        photoUrl: photoPreview || undefined,
        pdfName: pdfName || undefined,
        satelliteUrl: (fd.get("satellite") as string) || undefined,
      });
      toast.success("Tokens minted successfully!", { description: `TX: ${txHash.slice(0, 18)}...` });
      e.currentTarget.reset();
      setPhotoPreview(null);
      setPdfName(null);
    } catch {
      toast.error("Minting failed");
    }
    setMinting(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <WalletGuard>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Issuer Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tokens Issued" value={totalIssued.toLocaleString()} icon={<Leaf className="w-5 h-5" />} />
          <StatCard label="Tokens Sold" value={totalSold.toLocaleString()} icon={<BarChart3 className="w-5 h-5" />} />
          <StatCard label="Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} />
          <StatCard label="CO₂ Impact" value={`${totalIssued.toLocaleString()} tCO₂`} icon={<Zap className="w-5 h-5" />} />
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-4">Mint New Carbon Credits</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input name="name" placeholder="Project name" required />
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Project type" /></SelectTrigger>
                <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select name="country" required>
                <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input name="tokens" type="number" placeholder="Tokens (tCO₂)" min={1} required />
                <Input name="price" type="number" placeholder="Price (USD)" min={1} step={0.01} required />
              </div>
              <Textarea name="description" placeholder="Project description" rows={3} required />
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> Geotagged Photo</label>
                <Input type="file" accept="image/*" onChange={handlePhotoChange} />
                {photoPreview && <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-md" />}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> PDF Document</label>
                <Input type="file" accept=".pdf" onChange={(e) => setPdfName(e.target.files?.[0]?.name || null)} />
                {pdfName && <p className="text-xs text-muted-foreground">📄 {pdfName}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Satellite Image URL</label>
                <Input name="satellite" placeholder="https://..." />
              </div>

              <Button type="submit" disabled={minting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {minting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Minting...</> : <><CheckCircle className="w-4 h-4 mr-2" />Mint Tokens</>}
              </Button>
            </form>
          </div>

          {/* Chart */}
          <div className="lg:col-span-3 bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-4">Tokens Issued Per Month</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }} />
                <Line type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-5 border-b"><h2 className="font-semibold">Issued Tokens</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Token ID</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Country</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Minted</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Price</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground"></th>
              </tr></thead>
              <tbody>
                {displayProjects.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs">{p.id}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.countryFlag} {p.country}</td>
                    <td className="p-3 text-right">{p.tokensMinted.toLocaleString()}</td>
                    <td className="p-3 text-right">${p.pricePerToken}</td>
                    <td className="p-3 text-center"><StatusBadge status={p.tokensSold > 0 && p.tokensSold === p.tokensMinted ? "Retired" : p.status} /></td>
                    <td className="p-3 text-muted-foreground">{p.dateIssued}</td>
                    <td className="p-3"><Link to={`/evidence/${p.id}`} className="text-primary hover:underline text-xs">View Evidence</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WalletGuard>
  );
};

export default Issuer;
