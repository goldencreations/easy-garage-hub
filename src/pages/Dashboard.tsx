import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Car,
  FileText,
  Package,
  Receipt,
  Wrench,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { adminStatsRequest, listCarsRequest, listServicesRequest, type AdminStatsApi, type AdminStatsFilter } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

const defaultStats: AdminStatsApi = {
  filter: "monthly",
  from_date: "",
  to_date: "",
  customers_count: 0,
  cars_count: 0,
  invoices_count: 0,
  stock_items_count: 0,
  expenses_count: 0,
  revenues_total: 0,
  expenses_total: 0,
  low_stock_count: 0,
  low_stock_items: [],
};

export default function Dashboard() {
  const { token, user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [filter, setFilter] = useState<AdminStatsFilter>("monthly");
  const [stats, setStats] = useState<AdminStatsApi>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [carsById, setCarsById] = useState<Record<string, string>>({});
  const [recentServices, setRecentServices] = useState<Array<{ id: string; date: string; problem: string; status: string; staff?: { name: string }; car_id: string | number }>>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [statsRes, carsRes, servicesRes] = await Promise.all([
          isSuperAdmin ? adminStatsRequest(token, filter) : Promise.resolve({ data: defaultStats }),
          listCarsRequest(token),
          listServicesRequest(token),
        ]);

        setStats(statsRes.data);
        setCarsById(
          carsRes.data.reduce<Record<string, string>>((acc, car) => {
            acc[String(car.id)] = car.plate_number;
            return acc;
          }, {}),
        );
        setRecentServices(
          servicesRes.data.slice(0, 5).map((service) => ({
            id: String(service.id),
            date: service.date,
            problem: service.problem,
            status: service.status,
            staff: service.leading_staff ? { name: service.leading_staff.name } : undefined,
            car_id: service.car_id,
          })),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token, filter, isSuperAdmin]);

  const revenueChart = useMemo(
    () => [
      { label: "Revenue", value: stats.revenues_total },
      { label: "Expenses", value: stats.expenses_total },
    ],
    [stats.revenues_total, stats.expenses_total],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          isSuperAdmin
            ? `Statistics from ${formatDate(stats.from_date)} to ${formatDate(stats.to_date)}`
            : "Overview"
        }
        actions={
          isSuperAdmin ? (
            <div className="w-44">
              <Select value={filter} onValueChange={(value) => setFilter(value as AdminStatsFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
      />

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading statistics...
        </div>
      ) : (
        <>
          {isSuperAdmin && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Customers" value={stats.customers_count} icon={Users} tone="primary" />
                <StatCard label="Cars" value={stats.cars_count} icon={Car} tone="accent" />
                <StatCard label="Invoices" value={stats.invoices_count} icon={FileText} tone="success" />
                <StatCard label="Stock Items" value={stats.stock_items_count} icon={Package} tone="primary" />
                <StatCard label="Expenses" value={formatCurrency(stats.expenses_total)} icon={Receipt} tone="warning" />
                <StatCard label="Revenue" value={formatCurrency(stats.revenues_total)} icon={TrendingUp} tone="success" />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <DataCard title="Revenue Overview">
                  <div className="h-72 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${Number(v) / 1000}k`} />
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
                    {stats.low_stock_items.length === 0 && (
                      <p className="p-5 text-sm text-muted-foreground">All items are well stocked ✅</p>
                    )}
                    {stats.low_stock_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Category ID: {item.stock_category_id}</p>
                        </div>
                        <Badge variant="outline" className="border-warning text-warning">
                          {item.quantity} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                </DataCard>
              </div>
            </>
          )}

          <DataCard title="Recent Service Activity">
            <div className="divide-y">
              {recentServices.map((service) => (
                <div key={service.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {(carsById[String(service.car_id)] ?? "Unknown Plate")} — {service.problem}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(service.date)} • Handled by {service.staff?.name ?? "N/A"}
                    </p>
                  </div>
                  <Badge
                    className={
                      service.status === "complete"
                        ? "bg-success text-success-foreground hover:bg-success"
                        : service.status === "onprogress"
                          ? "border-warning text-warning"
                          : "border-muted-foreground text-muted-foreground"
                    }
                    variant={service.status === "complete" ? "default" : "outline"}
                  >
                    {service.status}
                  </Badge>
                </div>
              ))}
              {recentServices.length === 0 && (
                <p className="p-5 text-sm text-muted-foreground">No recent services found.</p>
              )}
            </div>
          </DataCard>
        </>
      )}
    </div>
  );
}
