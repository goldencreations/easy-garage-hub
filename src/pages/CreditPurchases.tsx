import { useEffect, useState } from "react";
import { BadgeDollarSign, Loader2, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCreditPurchaseRequest,
  deleteCreditPurchaseRequest,
  listCreditPurchasesRequest,
  updateCreditPurchaseRequest,
  type CreditPurchaseApi,
  type CreditPurchasePaymentStatus,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

const PAYMENT_STATUS_OPTIONS: Array<{ value: CreditPurchasePaymentStatus; label: string }> = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

export default function CreditPurchases() {
  const { token } = useAuth();
  const [list, setList] = useState<CreditPurchaseApi[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CreditPurchasePaymentStatus | "">("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CreditPurchaseApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCreditPurchases = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await listCreditPurchasesRequest(token, {
          search: query,
          payment_status: statusFilter,
          supplier_name: supplierFilter,
        });
        setList(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load credit purchases.");
      } finally {
        setLoading(false);
      }
    };

    void loadCreditPurchases();
  }, [token, query, statusFilter, supplierFilter]);

  const totalCredit = list.reduce((sum, purchase) => sum + (Number(purchase.total_amount) || 0), 0);
  const totalPaid = list.reduce((sum, purchase) => sum + (Number(purchase.amount_paid) || 0), 0);
  const totalDue = list.reduce((sum, purchase) => sum + (Number(purchase.amount_due) || 0), 0);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (purchase: CreditPurchaseApi) => {
    setEditing(purchase);
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const form = new FormData(e.currentTarget);
    const item_name = String(form.get("item_name") ?? "").trim();
    const supplier_name = String(form.get("supplier_name") ?? "").trim();
    const total_amount = Number(String(form.get("total_amount") ?? "").replace(/,/g, "").trim());
    const amount_paid_raw = String(form.get("amount_paid") ?? "").replace(/,/g, "").trim();
    const amount_paid = amount_paid_raw ? Number(amount_paid_raw) : 0;
    const date = String(form.get("date") ?? "");

    if (!item_name || !supplier_name || !date) {
      toast.error("Item, supplier, and date are required.");
      return;
    }

    if (!Number.isFinite(total_amount) || total_amount <= 0) {
      toast.error("Enter a valid total amount.");
      return;
    }

    if (!Number.isFinite(amount_paid) || amount_paid < 0) {
      toast.error("Enter a valid paid amount.");
      return;
    }

    if (amount_paid > total_amount) {
      toast.error("Paid amount cannot be greater than total amount.");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const response = await updateCreditPurchaseRequest(token, editing.id, {
          item_name,
          supplier_name,
          total_amount,
          amount_paid,
          date,
        });
        setList((prev) =>
          prev.map((purchase) =>
            String(purchase.id) === String(editing.id) ? response.data : purchase,
          ),
        );
        toast.success("Credit purchase updated");
      } else {
        const response = await createCreditPurchaseRequest(token, {
          item_name,
          supplier_name,
          total_amount,
          amount_paid,
          date,
        });
        setList((prev) => [response.data, ...prev]);
        toast.success("Credit purchase created");
      }

      setOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save credit purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (creditPurchaseId: string | number) => {
    if (!token) return;
    try {
      await deleteCreditPurchaseRequest(token, creditPurchaseId);
      setList((prev) => prev.filter((purchase) => String(purchase.id) !== String(creditPurchaseId)));
      toast.success("Credit purchase deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete credit purchase.");
    }
  };

  const statusBadge = (status: CreditPurchasePaymentStatus) => {
    if (status === "paid") return "bg-success text-success-foreground hover:bg-success";
    if (status === "partial") return "bg-warning text-warning-foreground hover:bg-warning";
    return "bg-muted text-muted-foreground hover:bg-muted";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Purchases"
        description="Track supplier purchases on credit, paid amounts, and balances due."
        actions={(
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={openAdd}>
                <Plus className="mr-2 h-5 w-5" /> Add Credit Purchase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Update Credit Purchase" : "New Credit Purchase"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="space-y-2">
                  <Label>Item Name *</Label>
                  <Input name="item_name" required defaultValue={editing?.item_name} placeholder="e.g. Engine Oil 5W-30" />
                </div>
                <div className="space-y-2">
                  <Label>Supplier Name *</Label>
                  <Input name="supplier_name" required defaultValue={editing?.supplier_name} placeholder="e.g. ABC Auto Spares" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Total Amount (TSH) *</Label>
                    <Input
                      name="total_amount"
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={editing?.total_amount}
                      placeholder="500000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Paid (TSH)</Label>
                    <Input
                      name="amount_paid"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={editing?.amount_paid ?? 0}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input name="date" type="date" required defaultValue={editing?.date ?? new Date().toISOString().slice(0, 10)} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                    {submitting ? "Saving..." : editing ? "Update Credit Purchase" : "Save Credit Purchase"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Credit Value" value={formatCurrency(totalCredit)} icon={ReceiptText} tone="warning" />
        <StatCard label="Amount Paid" value={formatCurrency(totalPaid)} icon={BadgeDollarSign} tone="success" />
        <StatCard label="Amount Due" value={formatCurrency(totalDue)} icon={ReceiptText} tone="accent" />
      </div>

      <DataCard
        actions={(
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search by item or supplier..." />
            <Input
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              placeholder="Filter by supplier..."
              className="w-52"
            />
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : (value as CreditPurchasePaymentStatus))}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportActions entity="credit-purchases" />
          </>
        )}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading credit purchases...</span>
                  </TableCell>
                </TableRow>
              )}
              {list.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>{formatDate(purchase.date)}</TableCell>
                  <TableCell className="font-semibold">{purchase.item_name}</TableCell>
                  <TableCell>{purchase.supplier_name}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(purchase.total_amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(purchase.amount_paid)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(purchase.amount_due)}</TableCell>
                  <TableCell>
                    <Badge className={statusBadge(purchase.payment_status)}>
                      {purchase.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(purchase)}>
                        <Pencil className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void handleDelete(purchase.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No credit purchases found.
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
