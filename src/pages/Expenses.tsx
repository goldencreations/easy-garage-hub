import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Receipt, TrendingDown, Calendar } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { expenses, formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Expenses() {
  const [query, setQuery] = useState("");
  const filtered = expenses.filter((e) => {
    const q = query.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
  });
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Record and track all garage expenses."
        actions={
          <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={() => toast("Expense form")}>
            <Plus className="mr-2 h-5 w-5" /> Add Expense
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Expenses" value={formatCurrency(total)} icon={Receipt} tone="warning" />
        <StatCard label="This Month" value={formatCurrency(total)} icon={Calendar} tone="primary" />
        <StatCard label="Categories" value={new Set(expenses.map(e => e.category)).size} icon={TrendingDown} tone="accent" />
      </div>

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search expenses…" />
            <ExportActions entity="expenses" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Expense</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="font-semibold">{e.name}</TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{e.description}</TableCell>
                  <TableCell>{e.recordedBy}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataCard>
    </div>
  );
}
