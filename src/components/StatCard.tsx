import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  tone?: "primary" | "accent" | "success" | "warning" | "destructive";
};

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export function StatCard({ label, value, icon: Icon, trend, tone = "primary" }: Props) {
  return (
    <Card className="flex items-center gap-4 border bg-gradient-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        {trend && <p className="mt-0.5 text-xs text-muted-foreground">{trend}</p>}
      </div>
    </Card>
  );
}
