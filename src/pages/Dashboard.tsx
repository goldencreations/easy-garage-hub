import {
  Users,
  Car,
  FileText,
  Package,
  Receipt,
  Wrench,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import {
  customers,
  cars,
  invoices,
  stock,
  expenses,
  services,
  formatCurrency,
} from "@/lib/mock-data";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const monthlyRevenue = [
  { month: "Nov", value: 142000 },
  { month: "Dec", value: 188000 },
  { month: "Jan", value: 165000 },
  { month: "Feb", value: 210000 },
  { month: "Mar", value: 245000 },
  { month: "Apr", value: 298000 },
];

export default function Dashboard() {
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const lowStock = stock.filter((s) => s.quantity <= s.lowStockThreshold);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome back, David 👋"
        description="Here's what's happening at your garage today."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Customers" value={customers.length} icon={Users} tone="primary" />
        <StatCard label="Cars" value={cars.length} icon={Car} tone="accent" />
        <StatCard label="Invoices" value={invoices.length} icon={FileText} tone="success" />
        <StatCard label="Stock Items" value={stock.length} icon={Package} tone="primary" />
        <StatCard label="Expenses" value={formatCurrency(totalExpenses)} icon={Receipt} tone="warning" />
        <StatCard label="Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DataCard title="Monthly Revenue" >
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        <DataCard title="Low Stock Alerts">
          <div className="divide-y">
            {lowStock.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">All items are well stocked ✅</p>
            )}
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <Badge variant="outline" className="border-warning text-warning">
                  {item.quantity} left
                </Badge>
              </div>
            ))}
          </div>
        </DataCard>
      </div>

      <DataCard title="Recent Service Activity">
        <div className="divide-y">
          {services.slice(0, 5).map((s) => {
            const car = cars.find((c) => c.id === s.carId);
            return (
              <div key={s.id} className="flex items-center gap-4 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {car?.plate} — {s.problem}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.date} • Handled by {s.staff}
                  </p>
                </div>
                <Badge
                  variant={s.status === "Completed" ? "default" : "outline"}
                  className={
                    s.status === "Completed"
                      ? "bg-success text-success-foreground hover:bg-success"
                      : s.status === "In Progress"
                      ? "border-warning text-warning"
                      : "border-muted-foreground text-muted-foreground"
                  }
                >
                  {s.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </DataCard>
    </div>
  );
}
