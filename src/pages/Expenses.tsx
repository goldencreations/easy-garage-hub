import { useEffect, useState } from "react";
import { Calendar, Loader2, Pencil, Plus, Receipt, Trash2, TrendingDown, MoreHorizontal } from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  createExpenseRequest,
  deleteExpenseRequest,
  listExpensesRequest,
  openingBalanceSuggestionRequest,
  updateExpenseRequest,
  type ExpenseApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

const CATEGORIES: Array<{ value: "stock_purchase" | "salary" | "operation" | "other"; label: string }> = [
  { value: "stock_purchase", label: "Stock Purchase" },
  { value: "salary", label: "Salary" },
  { value: "operation", label: "Operation" },
  { value: "other", label: "Other" },
];

export default function Expenses() {
  const { token } = useAuth();
  const [list, setList] = useState<ExpenseApi[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseApi | null>(null);
  const [category, setCategory] = useState<ExpenseApi["category"] | "">("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadExpenses = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await listExpensesRequest(token, { search: query });
        setList(
          response.data.map((expense) => ({
            ...expense,
            amount: Number(expense.amount) || 0,
          })),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load expenses.");
      } finally {
        setLoading(false);
      }
    };

    void loadExpenses();
  }, [token, query]);

  const filtered = list;

  const total = list.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const now = new Date();
  const currentMonthTotal = list
    .filter((expense) => {
      const date = new Date(expense.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  const openAdd = () => {
    setEditing(null);
    setCategory("");
    setOpen(true);
  };

  const openEdit = (expense: ExpenseApi) => {
    setEditing(expense);
    setCategory(expense.category);
    setOpen(true);
  };

  const applyOpeningBalanceSuggestion = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!token) return;
    const form = (e.currentTarget as HTMLButtonElement).closest("form");
    const dateInput = form?.querySelector<HTMLInputElement>('input[name="date"]');
    const date = dateInput?.value?.trim();
    if (!date) {
      toast.error("Pick an expense date first.");
      return;
    }
    try {
      const res = await openingBalanceSuggestionRequest(token, date);
      const suggested = res.data.suggested_balance_bd;
      if (suggested == null || suggested === "") {
        toast.info("No prior balance C/D found before this date.");
        return;
      }
      const bdInput = form?.querySelector<HTMLInputElement>('input[name="balance_bd"]');
      if (bdInput) bdInput.value = suggested;
      toast.success("Balance B/D filled from last balance C/D.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load suggestion.");
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    if (!category) {
      toast.error("Select a category");
      return;
    }

    const form = new FormData(e.currentTarget);
    const amountRaw = String(form.get("amount") ?? "").replace(/,/g, "").trim();
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    const balanceBdRaw = String(form.get("balance_bd") ?? "").replace(/,/g, "").trim();
    const balanceCdRaw = String(form.get("balance_cd") ?? "").replace(/,/g, "").trim();
    const balance_bd = balanceBdRaw === "" ? undefined : Number(balanceBdRaw);
    const balance_cd = balanceCdRaw === "" ? undefined : Number(balanceCdRaw);
    if (balance_bd !== undefined && !Number.isFinite(balance_bd)) {
      toast.error("Balance B/D must be a valid number.");
      return;
    }
    if (balance_cd !== undefined && !Number.isFinite(balance_cd)) {
      toast.error("Balance C/D must be a valid number.");
      return;
    }

    const payload = {
      title: String(form.get("title")),
      category,
      amount,
      date: String(form.get("date")) || new Date().toISOString().slice(0, 10),
      description: String(form.get("description") ?? ""),
      ...(balance_bd !== undefined ? { balance_bd } : {}),
      ...(balance_cd !== undefined ? { balance_cd } : {}),
    };

    setSubmitting(true);
    try {
      if (editing) {
        const response = await updateExpenseRequest(token, editing.id, payload);
        setList((prev) =>
          prev.map((item) =>
            String(item.id) === String(editing.id)
              ? {
                  ...response.data,
                  amount: Number(response.data.amount) || 0,
                }
              : item,
          ),
        );
        toast.success("Expense updated");
      } else {
        const response = await createExpenseRequest(token, payload);
        setList((prev) => [{ ...response.data, amount: Number(response.data.amount) || 0 }, ...prev]);
        toast.success("Expense recorded");
      }
      setOpen(false);
      setEditing(null);
      setCategory("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expenseId: string | number) => {
    if (!token) return;
    try {
      await deleteExpenseRequest(token, expenseId);
      setList((prev) => prev.filter((item) => String(item.id) !== String(expenseId)));
      toast.success("Expense deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete expense.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Record and track all garage expenses."
        actions={
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setEditing(null);
                setCategory("");
              }
            }}
          >
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={() => openAdd()}>
              <Plus className="mr-2 h-5 w-5" /> Add Expense
            </Button>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Update Expense" : "Record New Expense"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="space-y-2"><Label>Expense Title *</Label><Input name="title" required defaultValue={editing?.title} placeholder="e.g. Workshop rent" /></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={category} onValueChange={(value) => setCategory(value as ExpenseApi["category"])}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (TSH) *</Label>
                    <Input
                      name="amount"
                      required
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      defaultValue={editing?.amount}
                      placeholder="30000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <Label>Date</Label>
                    <Button type="button" variant="outline" size="sm" onClick={applyOpeningBalanceSuggestion}>
                      Suggest Balance B/D
                    </Button>
                  </div>
                  <Input name="date" type="date" defaultValue={editing?.date ?? new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Balance B/D (brought down)</Label>
                    <Input
                      name="balance_bd"
                      type="text"
                      inputMode="decimal"
                      defaultValue={editing?.balance_bd != null && editing.balance_bd !== "" ? String(editing.balance_bd) : ""}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Balance C/D (carried down)</Label>
                    <Input
                      name="balance_cd"
                      type="text"
                      inputMode="decimal"
                      defaultValue={editing?.balance_cd != null && editing.balance_cd !== "" ? String(editing.balance_cd) : ""}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea name="description" defaultValue={editing?.description ?? ""} placeholder="Optional notes" /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                    {submitting ? "Saving..." : editing ? "Update Expense" : "Save Expense"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Expenses" value={formatCurrency(total)} icon={Receipt} tone="warning" />
        <StatCard label="This Month" value={formatCurrency(currentMonthTotal)} icon={Calendar} tone="primary" />
        <StatCard label="Categories" value={new Set(list.map((e) => e.category)).size} icon={TrendingDown} tone="accent" />
      </div>

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search expenses..." />
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
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Bal. B/D</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Bal. C/D</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading expenses...</span>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell className="font-semibold">{expense.title}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant="secondary">{CATEGORIES.find((cat) => cat.value === expense.category)?.label ?? expense.category}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{expense.description}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-muted-foreground">
                    {expense.balance_bd != null && expense.balance_bd !== "" ? formatCurrency(expense.balance_bd) : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-muted-foreground">
                    {expense.balance_cd != null && expense.balance_cd !== "" ? formatCurrency(expense.balance_cd) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(expense)}>
                        <Pencil className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void handleDelete(expense.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex justify-end sm:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Open actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(expense)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void handleDelete(expense.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No expenses found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DataCard>
    </div>
  );
}
