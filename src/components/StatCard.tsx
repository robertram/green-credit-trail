import { ReactNode } from "react";

export function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon?: ReactNode; sub?: string }) {
  return (
    <div className="bg-card rounded-lg border p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-primary/60">{icon}</span>}
      </div>
      <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
