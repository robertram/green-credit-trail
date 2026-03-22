import { Link } from "react-router-dom";
import { ArrowRight, Leaf, Shield, ShoppingCart, Trees, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import heroImage from "@/assets/hero-forest.jpg";

const Index = () => {
  const { projects } = useApp();
  const totalCO2 = projects.reduce((s, p) => s + p.tokensSold, 0);
  const totalProjects = projects.length;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Tropical forest canopy" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-28 md:py-36">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground/90 text-xs font-medium mb-6 border border-primary/30">
              <Leaf className="w-3.5 h-3.5" /> Powered by Avalanche Network
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground leading-tight mb-4 tracking-tight">
              Transparent Carbon Credits for a Sustainable Future
            </h1>
            <p className="text-lg text-primary-foreground/75 mb-8 leading-relaxed">
              Issue, trade, and verify tokenized carbon credits backed by real-world environmental evidence. Every ton of CO₂ is traceable on-chain.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/marketplace"><ShoppingCart className="w-4 h-4 mr-2" />Buy Credits</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/issuer"><Leaf className="w-4 h-4 mr-2" />Issue Credits</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Leaf, title: "Issue", desc: "Project developers mint carbon credit tokens backed by verified environmental data and evidence." },
            { icon: Shield, title: "Verify", desc: "Independent auditors verify evidence through geotagged photos, satellite imagery, and documents." },
            { icon: ShoppingCart, title: "Buy & Offset", desc: "Companies purchase verified credits to offset their emissions with full on-chain transparency." },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center">{i + 1}</span>
                <h3 className="font-semibold text-lg">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              {i < 2 && <ArrowRight className="hidden md:block text-muted-foreground/30 absolute" />}
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-t bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Trees, label: "Active Projects", value: totalProjects },
              { icon: Globe, label: "Total CO₂ Offset", value: `${(totalCO2).toLocaleString()} tCO₂` },
              { icon: Zap, label: "Transactions", value: "2,847" },
              { icon: ShoppingCart, label: "Credits Traded", value: `$${(totalCO2 * 28).toLocaleString()}` },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
