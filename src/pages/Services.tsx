import { useState } from "react";
import { Plus, FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { services, cars, customers, formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Services() {
  const [query, setQuery] = useState("");

  const filtered = services.filter((s) => {
    const car = cars.find((c) => c.id === s.carId);
    const q = query.toLowerCase();
    return (
      car?.plate.toLowerCase().includes(q) ||
      s.problem.toLowerCase().includes(q) ||
      s.staff.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service & Repair History"
        description="Every problem, fix, part, and staff member — for every car."
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => toast.success("Yearly report generated")}>
              <FileBarChart className="mr-2 h-5 w-5" /> Yearly Report
            </Button>
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={() => toast("Service form")}>
              <Plus className="mr-2 h-5 w-5" /> New Service
            </Button>
          </>
        }
      />

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search by plate, problem, staff…" />
            <ExportActions entity="services" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead className="hidden md:table-cell">Fix</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const car = cars.find((c) => c.id === s.carId);
                const cust = customers.find((c) => c.id === car?.customerId);
                const partsCost = s.partsUsed.reduce((sum, p) => sum + p.qty * p.price, 0);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{s.date}</TableCell>
                    <TableCell>
                      <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
                        {car?.plate}
                      </span>
                    </TableCell>
                    <TableCell>{cust?.name}</TableCell>
                    <TableCell className="font-medium">{s.problem}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{s.fix}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(partsCost + s.labourCharge)}</TableCell>
                    <TableCell>{s.staff}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          s.status === "Completed"
                            ? "bg-success text-success-foreground hover:bg-success"
                            : s.status === "In Progress"
                            ? "bg-warning text-warning-foreground hover:bg-warning"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DataCard>
    </div>
  );
}
