import { useEffect, useState } from "react";
import { BookOpen, Loader2, Pencil, Plus, Receipt, Trash2, TrendingDown, TrendingUp, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  createExpenseRequest,
  createIncomeEntryRequest,
  deleteExpenseRequest,
  deleteIncomeEntryRequest,
  getExpenseLedgerRequest,
  listExpensesRequest,
  listIncomeEntriesRequest,
  updateExpenseRequest,
  updateIncomeEntryRequest,
  type ExpenseApi,
  type ExpenseLedgerApi,
  type IncomeEntryApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

const CATEGORIES: Array<{ value: ExpenseApi["category"]; label: string }> = [
  { value: "stock_purchase", label: "Stock Purchase" },
  { value: "salary", label: "Salary" },
  { value: "operation", label: "Operation" },
  { value: "other", label: "Other" },
];

const PERIODS: Array<{ value: ExpenseLedgerApi["period"]; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function Expenses() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"cashbook" | "matumizi" | "mapato">("cashbook");
  const [ledger, setLedger] = useState<ExpenseLedgerApi | null>(null);
  const [ledgerPeriod, setLedgerPeriod] = useState<ExpenseLedgerApi["period"]>("monthly");
  const [ledgerDate, setLedgerDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ledgerLoading, setLedgerLoading] = useState(true);

  const [expenses, setExpenses] = useState<ExpenseApi[]>([]);
  const [incomeList, setIncomeList] = useState<IncomeEntryApi[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [incomeLoading, setIncomeLoading] = useState(false);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseApi | null>(null);
  const [editingIncome, setEditingIncome] = useState<IncomeEntryApi | null>(null);
  const [category, setCategory] = useState<ExpenseApi["category"] | "">("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadLedger = async () => {
      if (!token) {
        setLedgerLoading(false);
        return;
      }
      setLedgerLoading(true);
      try {
        const res = await getExpenseLedgerRequest(token, { period: ledgerPeriod, date: ledgerDate });
        setLedger(res.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load cashbook.");
        setLedger(null);
      } finally {
        setLedgerLoading(false);
      }
    };
    void loadLedger();
  }, [token, ledgerPeriod, ledgerDate]);

  useEffect(() => {
    const loadExpenses = async () => {
      if (!token || activeTab !== "matumizi") return;
      setExpensesLoading(true);
      try {
        const response = await listExpensesRequest(token);
        setExpenses(
          response.data.map((expense) => ({
            ...expense,
            amount: Number(expense.amount) || 0,
          })),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load expenses.");
      } finally {
        setExpensesLoading(false);
      }
    };
    void loadExpenses();
  }, [token, activeTab]);

  useEffect(() => {
    const loadIncome = async () => {
      if (!token || activeTab !== "mapato") return;
      setIncomeLoading(true);
      try {
        const response = await listIncomeEntriesRequest(token);
        setIncomeList(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load income entries.");
      } finally {
        setIncomeLoading(false);
      }
    };
    void loadIncome();
  }, [token, activeTab]);

  const openAddExpense = () => {
    setEditingExpense(null);
    setCategory("");
    setExpenseOpen(true);
  };

  const openEditExpense = (expense: ExpenseApi) => {
    setEditingExpense(expense);
    setCategory(expense.category);
    setExpenseOpen(true);
  };

  const openAddIncome = () => {
    setEditingIncome(null);
    setIncomeOpen(true);
  };

  const openEditIncome = (entry: IncomeEntryApi) => {
    setEditingIncome(entry);
    setIncomeOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const payload = {
      title: String(form.get("title")),
      category,
      amount,
      date: String(form.get("date")) || new Date().toISOString().slice(0, 10),
      description: String(form.get("description") ?? ""),
    };

    setSubmitting(true);
    try {
      if (editingExpense) {
        const response = await updateExpenseRequest(token, editingExpense.id, payload);
        setExpenses((prev) =>
          prev.map((item) =>
            String(item.id) === String(editingExpense.id)
              ? { ...response.data, amount: Number(response.data.amount) || 0 }
              : item,
          ),
        );
        toast.success("Expense updated");
      } else {
        const response = await createExpenseRequest(token, payload);
        setExpenses((prev) => [{ ...response.data, amount: Number(response.data.amount) || 0 }, ...prev]);
        toast.success("Expense recorded");
      }
      setExpenseOpen(false);
      setEditingExpense(null);
      setCategory("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveIncome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const form = new FormData(e.currentTarget);
    const amountRaw = String(form.get("amount") ?? "").replace(/,/g, "").trim();
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    const payload = {
      date: String(form.get("date")) || new Date().toISOString().slice(0, 10),
      details: String(form.get("details")),
      amount,
    };

    setSubmitting(true);
    try {
      if (editingIncome) {
        const response = await updateIncomeEntryRequest(token, editingIncome.id, payload);
        setIncomeList((prev) =>
          prev.map((item) => (String(item.id) === String(editingIncome.id) ? response.data : item)),
        );
        toast.success("Income entry updated");
      } else {
        const response = await createIncomeEntryRequest(token, payload);
        setIncomeList((prev) => [response.data, ...prev]);
        toast.success("Income recorded");
      }
      setIncomeOpen(false);
      setEditingIncome(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save income.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string | number) => {
    if (!token) return;
    try {
      await deleteExpenseRequest(token, expenseId);
      setExpenses((prev) => prev.filter((item) => String(item.id) !== String(expenseId)));
      toast.success("Expense deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete expense.");
    }
  };

  const handleDeleteIncome = async (incomeId: string | number) => {
    if (!token) return;
    try {
      await deleteIncomeEntryRequest(token, incomeId);
      setIncomeList((prev) => prev.filter((item) => String(item.id) !== String(incomeId)));
      toast.success("Income entry deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete income entry.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashbook"
        description="DR (matumizi) and CR (mapato) ledger. Record expenses and manual income; paid invoices appear as CR automatically."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "cashbook" | "matumizi" | "mapato")}>
        <TabsList>
          <TabsTrigger value="cashbook">Cashbook</TabsTrigger>
          <TabsTrigger value="matumizi">Matumizi (DR)</TabsTrigger>
          <TabsTrigger value="mapato">Mapato (CR)</TabsTrigger>
        </TabsList>

        <TabsContent value="cashbook" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={ledgerPeriod} onValueChange={(v) => setLedgerPeriod(v as ExpenseLedgerApi["period"])}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anchor date</Label>
              <Input type="date" value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} className="w-44" />
            </div>
            {ledger && (
              <p className="text-sm text-muted-foreground pb-2">
                {formatDate(ledger.from)} — {formatDate(ledger.to)}
              </p>
            )}
          </div>

          {ledger && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <StatCard label="Balance B/D" value={formatCurrency(ledger.balance_bd)} icon={BookOpen} tone="primary" />
              <StatCard label="Mapato (CR)" value={formatCurrency(ledger.mapato)} icon={TrendingUp} tone="success" />
              <StatCard label="Matumizi (DR)" value={formatCurrency(ledger.matumizi)} icon={TrendingDown} tone="warning" />
              <StatCard label="Balance C/F" value={formatCurrency(ledger.balance_cf)} icon={Receipt} tone="accent" />
            </div>
          )}

          <DataCard>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>DR — Details</TableHead>
                    <TableHead className="text-right">DR Amount</TableHead>
                    <TableHead>CR — Details</TableHead>
                    <TableHead className="text-right">CR Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading cashbook...
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                  {!ledgerLoading && ledger?.rows.map((row, index) => (
                    <TableRow key={`${row.date}-${index}`}>
                      <TableCell className="whitespace-nowrap">{formatDate(row.date)}</TableCell>
                      <TableCell className="text-destructive/90">{row.debit?.details ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {row.debit ? formatCurrency(row.debit.amount) : "—"}
                      </TableCell>
                      <TableCell className="text-emerald-700 dark:text-emerald-400">{row.credit?.details ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700 dark:text-emerald-400">
                        {row.credit ? formatCurrency(row.credit.amount) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!ledgerLoading && (!ledger || ledger.rows.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No ledger entries for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DataCard>
        </TabsContent>

        <TabsContent value="matumizi" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={openAddExpense}>
              <Plus className="mr-2 h-5 w-5" /> Add expense (DR)
            </Button>
          </div>
          <DataCard>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right">Amount (DR)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline" /> Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell className="font-semibold">{expense.title}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">
                          {CATEGORIES.find((cat) => cat.value === expense.category)?.label ?? expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{expense.description}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditExpense(expense)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => void handleDeleteExpense(expense.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!expensesLoading && expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No expenses yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DataCard>
        </TabsContent>

        <TabsContent value="mapato" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={openAddIncome}>
              <Plus className="mr-2 h-5 w-5" /> Add income (CR)
            </Button>
          </div>
          <DataCard>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Amount (CR)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline" /> Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {incomeList.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-medium">{entry.details}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditIncome(entry)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => void handleDeleteIncome(entry.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!incomeLoading && incomeList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No manual income entries yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DataCard>
        </TabsContent>
      </Tabs>

      <Dialog open={expenseOpen} onOpenChange={(next) => { setExpenseOpen(next); if (!next) { setEditingExpense(null); setCategory(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingExpense ? "Update expense" : "Record expense (DR)"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveExpense}>
            <div className="space-y-2"><Label>Title *</Label><Input name="title" required defaultValue={editingExpense?.title} placeholder="e.g. Workshop rent" /></div>
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
                <Input name="amount" required type="number" min="1" step="1" defaultValue={editingExpense?.amount} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input name="date" type="date" defaultValue={editingExpense?.date ?? new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea name="description" defaultValue={editingExpense?.description ?? ""} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                {submitting ? "Saving..." : editingExpense ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={incomeOpen} onOpenChange={(next) => { setIncomeOpen(next); if (!next) setEditingIncome(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingIncome ? "Update income" : "Record income (CR)"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveIncome}>
            <div className="space-y-2"><Label>Details *</Label><Input name="details" required defaultValue={editingIncome?.details} placeholder="e.g. Cash sale - spare parts" /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount (TSH) *</Label>
                <Input name="amount" required type="number" min="1" step="1" defaultValue={editingIncome?.amount} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input name="date" type="date" defaultValue={editingIncome?.date ?? new Date().toISOString().slice(0, 10)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIncomeOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                {submitting ? "Saving..." : editingIncome ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
