import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Loader2, Plus, Receipt, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  { value: "stock_purchase", label: "Stock" },
  { value: "salary", label: "Salary" },
  { value: "operation", label: "Operation" },
  { value: "other", label: "Other" },
];

const PERIODS: Array<{ value: ExpenseLedgerApi["period"]; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const cellInputClass =
  "h-9 border-0 bg-transparent px-2 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-none";

type CashbookLine = {
  key: string;
  kind: "opening" | "entry" | "closing";
  date: string;
  drDetails: string;
  drAmount: number | null;
  crDetails: string;
  crAmount: number | null;
  balance: number;
  editable: boolean;
  expenseId?: string | number;
  incomeId?: string | number;
  category?: ExpenseApi["category"];
};

function entryKey(date: string, details: string, amount: number | string) {
  return `${String(date).slice(0, 10)}|${details.trim().toLowerCase()}|${Number(amount) || 0}`;
}

function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildCashbookLines(
  ledger: ExpenseLedgerApi,
  expenses: ExpenseApi[],
  incomes: IncomeEntryApi[],
): CashbookLine[] {
  const expenseByKey = new Map(
    expenses.map((expense) => [entryKey(expense.date, expense.title, expense.amount), expense]),
  );
  const incomeByKey = new Map(
    incomes.map((income) => [entryKey(income.date, income.details, income.amount), income]),
  );

  let balance = Number(ledger.balance_bd) || 0;
  const lines: CashbookLine[] = [
    {
      key: "opening",
      kind: "opening",
      date: ledger.from,
      drDetails: "",
      drAmount: null,
      crDetails: "Balance B/D",
      crAmount: null,
      balance,
      editable: false,
    },
  ];

  ledger.rows.forEach((row, index) => {
    const drAmount = row.debit ? Number(row.debit.amount) || 0 : null;
    const crAmount = row.credit ? Number(row.credit.amount) || 0 : null;
    if (drAmount) balance -= drAmount;
    if (crAmount) balance += crAmount;

    let editable = false;
    let expenseId: string | number | undefined;
    let incomeId: string | number | undefined;
    let category: ExpenseApi["category"] | undefined;

    if (row.debit) {
      const expense = expenseByKey.get(entryKey(row.date, row.debit.details, row.debit.amount));
      if (expense) {
        editable = true;
        expenseId = expense.id;
        category = expense.category;
      }
    }
    if (row.credit) {
      const income = incomeByKey.get(entryKey(row.date, row.credit.details, row.credit.amount));
      if (income) {
        editable = true;
        incomeId = income.id;
      }
    }

    lines.push({
      key: `row-${index}-${row.date}`,
      kind: "entry",
      date: row.date,
      drDetails: row.debit?.details ?? "",
      drAmount: drAmount || null,
      crDetails: row.credit?.details ?? "",
      crAmount: crAmount || null,
      balance,
      editable,
      expenseId,
      incomeId,
      category,
    });
  });

  lines.push({
    key: "closing",
    kind: "closing",
    date: ledger.to,
    drDetails: "",
    drAmount: null,
    crDetails: "Balance C/F",
    crAmount: null,
    balance: Number(ledger.balance_cf) || balance,
    editable: false,
  });

  return lines;
}

const emptyNewRow = () => ({
  date: new Date().toISOString().slice(0, 10),
  drDetails: "",
  drAmount: "",
  crDetails: "",
  crAmount: "",
  category: "other" as ExpenseApi["category"],
});

export default function Expenses() {
  const { token } = useAuth();
  const [ledger, setLedger] = useState<ExpenseLedgerApi | null>(null);
  const [ledgerPeriod, setLedgerPeriod] = useState<ExpenseLedgerApi["period"]>("monthly");
  const [ledgerDate, setLedgerDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseApi[]>([]);
  const [incomeList, setIncomeList] = useState<IncomeEntryApi[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [newRow, setNewRow] = useState(emptyNewRow);
  const [drafts, setDrafts] = useState<Record<string, Partial<CashbookLine>>>({});

  const refreshLedger = useCallback(async () => {
    if (!token) return;
    setLedgerLoading(true);
    try {
      const [ledgerRes, expensesRes, incomeRes] = await Promise.all([
        getExpenseLedgerRequest(token, { period: ledgerPeriod, date: ledgerDate }),
        listExpensesRequest(token),
        listIncomeEntriesRequest(token),
      ]);
      setLedger(ledgerRes.data);
      setExpenses(
        expensesRes.data.map((expense) => ({
          ...expense,
          amount: Number(expense.amount) || 0,
        })),
      );
      setIncomeList(incomeRes.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load cashbook.");
      setLedger(null);
    } finally {
      setLedgerLoading(false);
    }
  }, [token, ledgerPeriod, ledgerDate]);

  useEffect(() => {
    void refreshLedger();
  }, [refreshLedger]);

  const cashbookLines = useMemo(() => {
    if (!ledger) return [];
    const from = String(ledger.from).slice(0, 10);
    const to = String(ledger.to).slice(0, 10);
    const periodExpenses = expenses.filter((expense) => {
      const d = String(expense.date).slice(0, 10);
      return d >= from && d <= to;
    });
    const periodIncome = incomeList.filter((income) => {
      const d = String(income.date).slice(0, 10);
      return d >= from && d <= to;
    });
    return buildCashbookLines(ledger, periodExpenses, periodIncome);
  }, [ledger, expenses, incomeList]);

  const getLineDraft = (line: CashbookLine): CashbookLine => ({
    ...line,
    ...drafts[line.key],
  });

  const updateDraft = (key: string, patch: Partial<CashbookLine>) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleSaveNewRow = async () => {
    if (!token) return;
    const drAmount = parseAmount(newRow.drAmount);
    const crAmount = parseAmount(newRow.crAmount);
    const hasDr = Boolean(newRow.drDetails.trim() && drAmount);
    const hasCr = Boolean(newRow.crDetails.trim() && crAmount);

    if (!hasDr && !hasCr) {
      toast.error("Enter DR or CR details and amount.");
      return;
    }
    if (hasDr && hasCr) {
      toast.error("Enter either DR or CR on one row, not both.");
      return;
    }

    setSubmitting(true);
    try {
      if (hasDr) {
        await createExpenseRequest(token, {
          title: newRow.drDetails.trim(),
          category: newRow.category,
          amount: drAmount!,
          date: newRow.date,
          description: "",
        });
        toast.success("DR entry saved");
      } else {
        await createIncomeEntryRequest(token, {
          details: newRow.crDetails.trim(),
          amount: crAmount!,
          date: newRow.date,
        });
        toast.success("CR entry saved");
      }
      setNewRow(emptyNewRow());
      await refreshLedger();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveLine = async (line: CashbookLine) => {
    if (!token || !line.editable) return;
    const draft = getLineDraft(line);

    setSubmitting(true);
    try {
      if (line.expenseId) {
        const amount = draft.drAmount ?? line.drAmount;
        if (!draft.drDetails.trim() && !line.drDetails.trim()) {
          toast.error("DR particulars required.");
          return;
        }
        if (!amount || amount <= 0) {
          toast.error("Enter a valid DR amount.");
          return;
        }
        await updateExpenseRequest(token, line.expenseId, {
          title: (draft.drDetails || line.drDetails).trim(),
          category: draft.category ?? line.category ?? "other",
          amount,
          date: draft.date || line.date,
          description: "",
        });
        toast.success("DR entry updated");
      } else if (line.incomeId) {
        const amount = draft.crAmount ?? line.crAmount;
        if (!draft.crDetails.trim() && !line.crDetails.trim()) {
          toast.error("CR particulars required.");
          return;
        }
        if (!amount || amount <= 0) {
          toast.error("Enter a valid CR amount.");
          return;
        }
        await updateIncomeEntryRequest(token, line.incomeId, {
          details: (draft.crDetails || line.crDetails).trim(),
          amount,
          date: draft.date || line.date,
        });
        toast.success("CR entry updated");
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[line.key];
        return next;
      });
      await refreshLedger();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLine = async (line: CashbookLine) => {
    if (!token) return;
    setSubmitting(true);
    try {
      if (line.expenseId) {
        await deleteExpenseRequest(token, line.expenseId);
        toast.success("DR entry deleted");
      } else if (line.incomeId) {
        await deleteIncomeEntryRequest(token, line.incomeId);
        toast.success("CR entry deleted");
      }
      await refreshLedger();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSaveNewRow();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashbook"
        description="DR (matumizi) and CR (mapato) ledger. Type directly in the table — paid invoices post to CR automatically."
      />

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
          <p className="pb-2 text-sm text-muted-foreground">
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
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="min-w-[960px] border-collapse">
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="w-36 border-r font-bold">Date</TableHead>
                <TableHead className="border-r bg-destructive/5 font-bold text-destructive">DR — Particulars</TableHead>
                <TableHead className="w-32 border-r bg-destructive/5 text-right font-bold text-destructive">DR (TSH)</TableHead>
                <TableHead className="border-r bg-emerald-500/5 font-bold text-emerald-700 dark:text-emerald-400">CR — Particulars</TableHead>
                <TableHead className="w-32 border-r bg-emerald-500/5 text-right font-bold text-emerald-700 dark:text-emerald-400">CR (TSH)</TableHead>
                <TableHead className="w-36 text-right font-bold">Balance</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading cashbook...
                    </span>
                  </TableCell>
                </TableRow>
              )}

              {!ledgerLoading && cashbookLines.map((line) => {
                const draft = getLineDraft(line);
                const isOpening = line.kind === "opening";
                const isClosing = line.kind === "closing";

                if (isOpening || isClosing) {
                  return (
                    <TableRow key={line.key} className="bg-muted/30 font-semibold hover:bg-muted/30">
                      <TableCell className="border-r">{formatDate(line.date)}</TableCell>
                      <TableCell className="border-r" colSpan={2} />
                      <TableCell className="border-r italic text-muted-foreground">{line.crDetails}</TableCell>
                      <TableCell className="border-r" />
                      <TableCell className="text-right font-mono">{formatCurrency(line.balance)}</TableCell>
                      <TableCell />
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={line.key} className={line.editable ? "hover:bg-muted/20" : "bg-background"}>
                    <TableCell className="border-r p-0">
                      {line.editable ? (
                        <Input
                          type="date"
                          className={cellInputClass}
                          value={String(draft.date ?? line.date).slice(0, 10)}
                          onChange={(e) => updateDraft(line.key, { date: e.target.value })}
                          disabled={submitting}
                        />
                      ) : (
                        <span className="block px-2 py-2 text-sm">{formatDate(line.date)}</span>
                      )}
                    </TableCell>
                    <TableCell className="border-r p-0">
                      {line.drAmount != null ? (
                        line.editable && line.expenseId ? (
                          <div className="flex min-w-0 items-center gap-1">
                            <Select
                              value={draft.category ?? line.category ?? "other"}
                              onValueChange={(v) => updateDraft(line.key, { category: v as ExpenseApi["category"] })}
                            >
                              <SelectTrigger className="h-9 w-24 shrink-0 rounded-none border-0 border-r shadow-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              className={cellInputClass}
                              value={draft.drDetails ?? line.drDetails}
                              onChange={(e) => updateDraft(line.key, { drDetails: e.target.value })}
                              disabled={submitting}
                            />
                          </div>
                        ) : (
                          <span className="block px-2 py-2 text-sm text-destructive/90">{line.drDetails}</span>
                        )
                      ) : (
                        <span className="block px-2 py-2 text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="border-r p-0 text-right">
                      {line.drAmount != null ? (
                        line.editable && line.expenseId ? (
                          <Input
                            className={`${cellInputClass} text-right font-mono`}
                            value={draft.drAmount ?? line.drAmount}
                            onChange={(e) => updateDraft(line.key, { drAmount: parseAmount(e.target.value) ?? undefined })}
                            disabled={submitting}
                          />
                        ) : (
                          <span className="block px-2 py-2 font-mono text-sm text-destructive">{formatCurrency(line.drAmount)}</span>
                        )
                      ) : (
                        <span className="block px-2 py-2 text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="border-r p-0">
                      {line.crAmount != null ? (
                        line.editable && line.incomeId ? (
                          <Input
                            className={cellInputClass}
                            value={draft.crDetails ?? line.crDetails}
                            onChange={(e) => updateDraft(line.key, { crDetails: e.target.value })}
                            disabled={submitting}
                          />
                        ) : (
                          <span className="block px-2 py-2 text-sm text-emerald-700 dark:text-emerald-400">{line.crDetails}</span>
                        )
                      ) : (
                        <span className="block px-2 py-2 text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="border-r p-0 text-right">
                      {line.crAmount != null ? (
                        line.editable && line.incomeId ? (
                          <Input
                            className={`${cellInputClass} text-right font-mono`}
                            value={draft.crAmount ?? line.crAmount}
                            onChange={(e) => updateDraft(line.key, { crAmount: parseAmount(e.target.value) ?? undefined })}
                            disabled={submitting}
                          />
                        ) : (
                          <span className="block px-2 py-2 font-mono text-sm text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(line.crAmount)}
                          </span>
                        )
                      ) : (
                        <span className="block px-2 py-2 text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(line.balance)}</TableCell>
                    <TableCell className="p-1">
                      {line.editable && (
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Save row"
                            disabled={submitting}
                            onClick={() => void handleSaveLine(line)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            title="Delete row"
                            disabled={submitting}
                            onClick={() => void handleDeleteLine(line)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {!ledgerLoading && (
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableCell className="border-r p-0">
                    <Input
                      type="date"
                      className={cellInputClass}
                      value={newRow.date}
                      onChange={(e) => setNewRow((prev) => ({ ...prev, date: e.target.value }))}
                      onKeyDown={handleNewRowKeyDown}
                      disabled={submitting}
                    />
                  </TableCell>
                  <TableCell className="border-r p-0">
                    <div className="flex min-w-0 items-center gap-1">
                      <Select
                        value={newRow.category}
                        onValueChange={(v) => setNewRow((prev) => ({ ...prev, category: v as ExpenseApi["category"] }))}
                      >
                        <SelectTrigger className="h-9 w-24 shrink-0 rounded-none border-0 border-r shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className={cellInputClass}
                        placeholder="DR particulars…"
                        value={newRow.drDetails}
                        onChange={(e) => setNewRow((prev) => ({ ...prev, drDetails: e.target.value }))}
                        onKeyDown={handleNewRowKeyDown}
                        disabled={submitting}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="border-r p-0">
                    <Input
                      className={`${cellInputClass} text-right font-mono`}
                      placeholder="0"
                      inputMode="numeric"
                      value={newRow.drAmount}
                      onChange={(e) => setNewRow((prev) => ({ ...prev, drAmount: e.target.value }))}
                      onKeyDown={handleNewRowKeyDown}
                      disabled={submitting}
                    />
                  </TableCell>
                  <TableCell className="border-r p-0">
                    <Input
                      className={cellInputClass}
                      placeholder="CR particulars…"
                      value={newRow.crDetails}
                      onChange={(e) => setNewRow((prev) => ({ ...prev, crDetails: e.target.value }))}
                      onKeyDown={handleNewRowKeyDown}
                      disabled={submitting}
                    />
                  </TableCell>
                  <TableCell className="border-r p-0">
                    <Input
                      className={`${cellInputClass} text-right font-mono`}
                      placeholder="0"
                      inputMode="numeric"
                      value={newRow.crAmount}
                      onChange={(e) => setNewRow((prev) => ({ ...prev, crAmount: e.target.value }))}
                      onKeyDown={handleNewRowKeyDown}
                      disabled={submitting}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground italic">New row</TableCell>
                  <TableCell className="p-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 bg-gradient-primary px-2"
                      disabled={submitting}
                      onClick={() => void handleSaveNewRow()}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              )}

              {!ledgerLoading && (!ledger || cashbookLines.length <= 2) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No transactions in this period yet. Use the blank row above to add DR or CR entries.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Fill DR side for matumizi (expenses) or CR side for mapato (income). Press Enter or + to save. Invoice payments appear as read-only CR rows.
        </p>
      </DataCard>
    </div>
  );
}
