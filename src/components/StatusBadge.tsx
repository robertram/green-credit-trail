import { cn } from "@/lib/utils";
import { VerificationStatus } from "@/context/AppContext";

const statusConfig: Record<VerificationStatus, { bg: string; text: string; dot: string }> = {
  Verified: { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  Pending: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  Retired: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export function StatusBadge({ status, size = "sm" }: { status: VerificationStatus; size?: "sm" | "lg" }) {
  const c = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium", c.bg, c.text, size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-4 py-1.5 text-sm")}>
      <span className={cn("rounded-full", c.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {status}
    </span>
  );
}
