import { useState } from "react";
import { Plus, Receipt, TrendingDown, Calendar } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { expenses as initialExpenses, formatCurrency, type Expense } from "@/lib/mock-data";
import { toast } from "sonner";

const CATEGORIES = ["Rent", "Utilities", "Supplies", "Tools", "Salary", "Transport", "Other"];

export default function Expenses() {
  const [list, setList] = useState<Expense[]>(initialExpenses);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");

  const filtered = list.filter((e) => {
    const q = query.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
  });
  const total = list.reduce((s, e) => s + e.amount, 0);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!category) { toast.error("Select a category"); return; }
    const f = new FormData(e.currentTarget);
    const newExp: Expense = {
      id: `e${Date.now()}`,
      name: String(f.get("name")),
      category,
      amount: Number(f.get("amount")),
      date: String(f.get("date")) || new Date().toISOString().slice(0, 10),
      description: String(f.get("description")),
      recordedBy: "Admin",
    };
    setList([newExp, ...list]);
    setOpen(false); setCategory("");
    toast.success("Expense recorded");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Record and track all garage expenses."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md">
                <Plus className="mr-2 h-5 w-5" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record New Expense</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleAdd}>
                <div className="space-y-2"><Label>Expense Name *</Label><Input name="name" required placeholder="e.g. Workshop rent" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Amount (TSH) *</Label><Input name="amount" required type="number" placeholder="0" /></div>
                </div>
                <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea name="description" placeholder="Optional notes" /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary">Save Expense</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Expenses" value={formatCurrency(total)} icon={Receipt} tone="warning" />
        <StatCard label="This Month" value={formatCurrency(total)} icon={Calendar} tone="primary" />
        <StatCard label="Categories" value={new Set(list.map(e => e.category)).size} icon={TrendingDown} tone="accent" />
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
