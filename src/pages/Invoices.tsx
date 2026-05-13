import { useEffect, useState } from "react";
import { Download, Eye, Loader2, Plus, Trash2, MoreHorizontal, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import {
  createInvoiceRequest,
  deleteInvoiceRequest,
  getInvoiceRequest,
  listCarsRequest,
  listCustomersRequest,
  listInvoicesRequest,
  listServicesRequest,
  listStocksRequest,
  recordInvoicePaymentRequest,
  updateInvoicePaymentRequest,
  updateInvoiceRequest,
  updateInvoicePaymentStatusRequest,
  type CarApi,
  type CustomerApi,
  type InvoiceApi,
  type InvoicePaymentApi,
  type InvoiceItemApi,
  type InvoiceItemPayload,
  type ServiceApi,
  type StockApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

const GARAGE_NAME = "AZIZI AUTOMOTIVE GARAGE";
const GARAGE_PHONE = "+255677401259";
const GARAGE_EMAIL = "aziziautomotivegarage1@gmail.com";
const GARAGE_LOCATION = "Kijitonyama, Dar es Salaam, Tanzania";
const GARAGE_TIN = "127-702-112";
const PAYMENT_ACCOUNT = "A/C NO: 24710015587 - NMB";
const PAYMENT_ACCOUNT_NAME = "A/C NAME: AZIZI AUTOMOTIVE GARAGE";

let logoDataUrlPromise: Promise<string | null> | null = null;

type DraftLineStock = { kind: "stock"; stock_id: string; quantity: string; line_total: string };
type DraftLineCustom = {
  kind: "custom";
  item_type: "labor" | "custom";
  description: string;
  quantity: string;
  unit_price: string;
  line_total: string;
};
type DraftLine = DraftLineStock | DraftLineCustom;

const emptyCustomLine = (): DraftLineCustom => ({
  kind: "custom",
  item_type: "custom",
  description: "",
  quantity: "",
  unit_price: "",
  line_total: "",
});

const emptyStockLine = (): DraftLineStock => ({
  kind: "stock",
  stock_id: "",
  quantity: "",
  line_total: "",
});

const formatTzs = (value: number) => new Intl.NumberFormat("en-US").format(Math.max(0, Number(value) || 0));
const formatInvoiceDateLong = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function parseOptionalAmount(s: string): number | undefined {
  const t = s.trim().replace(/,/g, ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** API allows positive numbers or non-numeric labels like SET. */
function quantityIsAllowed(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  const norm = t.replace(/,/g, ".");
  if (!Number.isNaN(Number(norm)) && Number.isFinite(Number(norm))) {
    return Number(norm) > 0;
  }
  return t.length <= 64;
}

function invoiceAmountPaid(invoice: InvoiceApi): number {
  if (invoice.amount_paid !== undefined && invoice.amount_paid !== null && String(invoice.amount_paid) !== "") {
    return Number(invoice.amount_paid) || 0;
  }
  if (invoice.payment_status === "paid") return Number(invoice.total) || 0;
  return 0;
}

function invoiceAmountDue(invoice: InvoiceApi): number {
  if (invoice.amount_due !== undefined && invoice.amount_due !== null && String(invoice.amount_due) !== "") {
    return Math.max(0, Number(invoice.amount_due) || 0);
  }
  const total = Number(invoice.total) || 0;
  return Math.max(0, total - invoiceAmountPaid(invoice));
}

function draftLinesFromInvoiceItems(items: InvoiceItemApi[]): DraftLine[] {
  const sorted = [...items].sort((a, b) => (Number(a.position ?? 0) || 0) - (Number(b.position ?? 0) || 0));
  return sorted.map((it) => {
    if (it.item_type === "stock") {
      return {
        kind: "stock",
        stock_id: it.stock_id != null ? String(it.stock_id) : "",
        quantity: String(it.quantity ?? ""),
        line_total: "",
      } satisfies DraftLineStock;
    }
    return {
      kind: "custom",
      item_type: it.item_type === "labor" ? "labor" : "custom",
      description: it.description ?? "",
      quantity: String(it.quantity ?? ""),
      unit_price: String(it.unit_price ?? ""),
      line_total: "",
    } satisfies DraftLineCustom;
  });
}

function buildInvoiceItemsPayloadFromDraft(
  lines: DraftLine[],
  stockById: Map<string, StockApi>,
): InvoiceItemPayload[] {
  const out: InvoiceItemPayload[] = [];
  for (const line of lines) {
    if (line.kind === "stock") {
      if (!line.stock_id.trim() || !quantityIsAllowed(line.quantity)) continue;
      const stock = stockById.get(String(line.stock_id));
      const payload: InvoiceItemPayload = {
        item_type: "stock",
        stock_id: line.stock_id,
        description: stock?.name ?? "",
        quantity: line.quantity.trim(),
      };
      const lt = parseOptionalAmount(line.line_total);
      if (lt !== undefined) payload.line_total = lt;
      out.push(payload);
      continue;
    }
    if (!line.description.trim() || !quantityIsAllowed(line.quantity)) continue;
    const unit = Number(line.unit_price.replace(/,/g, "."));
    if (!Number.isFinite(unit) || unit < 0) continue;
    const payload: InvoiceItemPayload = {
      item_type: line.item_type,
      description: line.description.trim(),
      quantity: line.quantity.trim(),
      unit_price: unit,
    };
    const lt = parseOptionalAmount(line.line_total);
    if (lt !== undefined) payload.line_total = lt;
    out.push(payload);
  }
  return out;
}

const loadLogoDataUrl = async () => {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch("/aziziumemelogo.png")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load logo");
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Failed to read logo"));
            reader.readAsDataURL(blob);
          }),
      )
      .catch(() => null);
  }
  return logoDataUrlPromise;
};

export default function Invoices() {
  const { token, user } = useAuth();
  const [list, setList] = useState<InvoiceApi[]>([]);
  const [customers, setCustomers] = useState<CustomerApi[]>([]);
  const [cars, setCars] = useState<CarApi[]>([]);
  const [services, setServices] = useState<ServiceApi[]>([]);
  const [stocks, setStocks] = useState<StockApi[]>([]);
  const [query, setQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [carSearch, setCarSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false);
  const [carSelectOpen, setCarSelectOpen] = useState(false);
  const [serviceSelectOpen, setServiceSelectOpen] = useState(false);
  const [stockSelectOpen, setStockSelectOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerApi[]>([]);
  const [carOptions, setCarOptions] = useState<CarApi[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceApi[]>([]);
  const [stockOptions, setStockOptions] = useState<StockApi[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<InvoiceApi | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [carId, setCarId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draftLines, setDraftLines] = useState<DraftLine[]>([emptyCustomLine()]);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPaidAt, setPaymentPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNote, setPaymentNote] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentEdit, setPaymentEdit] = useState<InvoicePaymentApi | null>(null);
  const [editPayAmount, setEditPayAmount] = useState("");
  const [editPayPaidAt, setEditPayPaidAt] = useState("");
  const [editPayNote, setEditPayNote] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const resetInvoiceForm = () => {
    setEditingInvoiceId(null);
    setCustomerId("");
    setCarId("");
    setServiceId("");
    setPaymentStatus("unpaid");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setDraftLines([emptyCustomLine()]);
  };

  const openCreateDialog = () => {
    resetInvoiceForm();
    setInvoiceDialogOpen(true);
  };

  const openEditDialog = async (invoice: InvoiceApi) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await getInvoiceRequest(token, invoice.id);
      const inv = res.data;
      setEditingInvoiceId(String(inv.id));
      setCustomerId(String(inv.customer_id));
      setCarId(String(inv.car_id));
      setServiceId(inv.service_id != null ? String(inv.service_id) : "");
      setPaymentStatus(inv.payment_status);
      setInvoiceDate(String(inv.date).slice(0, 10));
      const lines = draftLinesFromInvoiceItems(inv.items ?? []);
      setDraftLines(lines.length ? lines : [emptyCustomLine()]);
      setInvoiceDialogOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [invoicesRes, customersRes, carsRes, servicesRes, stocksRes] = await Promise.all([
          listInvoicesRequest(token, { search: query }),
          listCustomersRequest(token),
          listCarsRequest(token),
          listServicesRequest(token),
          listStocksRequest(token),
        ]);
        setList(invoicesRes.data);
        setCustomers(customersRes.data);
        setCars(carsRes.data);
        setServices(servicesRes.data);
        setStocks(stocksRes.data);
        setCustomerOptions(customersRes.data);
        setCarOptions(carsRes.data);
        setServiceOptions(servicesRes.data);
        setStockOptions(stocksRes.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load invoices.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token, query]);

  useEffect(() => {
    const loadCustomerOptions = async () => {
      if (!token || !customerSelectOpen) return;
      try {
        const response = await listCustomersRequest(token, { search: customerSearch });
        setCustomerOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search customers.");
      }
    };
    void loadCustomerOptions();
  }, [token, customerSelectOpen, customerSearch]);

  useEffect(() => {
    const loadCarOptions = async () => {
      if (!token || !carSelectOpen || !customerId) return;
      try {
        const response = await listCarsRequest(token, { search: carSearch, customer_id: customerId });
        setCarOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search cars.");
      }
    };
    void loadCarOptions();
  }, [token, carSelectOpen, carSearch, customerId]);

  useEffect(() => {
    const loadServiceOptions = async () => {
      if (!token || !serviceSelectOpen || !customerId || !carId) return;
      try {
        const response = await listServicesRequest(token, {
          search: serviceSearch,
          customer_id: customerId,
          car_id: carId,
        });
        setServiceOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search services.");
      }
    };
    void loadServiceOptions();
  }, [token, serviceSelectOpen, serviceSearch, customerId, carId]);

  useEffect(() => {
    const loadStockOptions = async () => {
      if (!token || !stockSelectOpen) return;
      try {
        const response = await listStocksRequest(token, { search: stockSearch });
        setStockOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search stock.");
      }
    };
    void loadStockOptions();
  }, [token, stockSelectOpen, stockSearch]);

  useEffect(() => {
    const loadView = async () => {
      if (!token || !viewId) {
        setViewingDetail(null);
        return;
      }
      setViewLoading(true);
      try {
        const res = await getInvoiceRequest(token, viewId);
        setViewingDetail(res.data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load invoice.");
        setViewingDetail(null);
      } finally {
        setViewLoading(false);
      }
    };
    void loadView();
  }, [token, viewId]);

  const filtered = list;
  const stockById = new Map(stocks.map((s) => [String(s.id), s]));

  const viewing = viewId ? (viewingDetail ?? list.find((invoice) => String(invoice.id) === viewId) ?? null) : null;
  const viewCustomer = viewing ? customers.find((c) => String(c.id) === String(viewing.customer_id)) : null;
  const viewCar = viewing ? cars.find((c) => String(c.id) === String(viewing.car_id)) : null;

  const updateDraftLine = (index: number, patch: Partial<DraftLineStock & DraftLineCustom>) =>
    setDraftLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (line.kind === "stock") {
          return { ...line, ...patch } as DraftLineStock;
        }
        return { ...line, ...patch } as DraftLineCustom;
      }),
    );

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!customerId || !carId) {
      toast.error("Select customer and car");
      return;
    }
    const invoice_items = buildInvoiceItemsPayloadFromDraft(draftLines, stockById);
    if (invoice_items.length === 0) {
      toast.error("Add at least one invoice line with valid quantity (number or SET).");
      return;
    }

    setSubmitting(true);
    try {
      if (editingInvoiceId) {
        const response = await updateInvoiceRequest(token, editingInvoiceId, {
          date: invoiceDate,
          customer_id: customerId,
          car_id: carId,
          service_id: serviceId || null,
          payment_status: paymentStatus,
          invoice_items,
        });
        setList((prev) => prev.map((inv) => (String(inv.id) === editingInvoiceId ? response.data : inv)));
        if (viewId === editingInvoiceId) setViewingDetail(response.data);
        toast.success("Invoice updated");
      } else {
        const response = await createInvoiceRequest(token, {
          date: invoiceDate,
          customer_id: customerId,
          car_id: carId,
          ...(serviceId ? { service_id: serviceId } : {}),
          payment_status: paymentStatus,
          invoice_items,
        });
        setList((prev) => [response.data, ...prev]);
        toast.success("Invoice created");
      }
      setInvoiceDialogOpen(false);
      resetInvoiceForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentStatus = async (invoiceId: string | number, value: "unpaid" | "partial" | "paid") => {
    if (!token) return;
    try {
      const response = await updateInvoicePaymentStatusRequest(token, invoiceId, value);
      const patch = response.data;
      setList((prev) =>
        prev.map((invoice) =>
          String(invoice.id) === String(invoiceId)
            ? {
                ...invoice,
                payment_status: patch.payment_status,
                amount_paid: patch.amount_paid ?? invoice.amount_paid,
                amount_due: patch.amount_due ?? invoice.amount_due,
                payments: patch.payments ?? invoice.payments,
              }
            : invoice,
        ),
      );
      if (viewId && String(viewId) === String(invoiceId)) {
        const detail = await getInvoiceRequest(token, invoiceId);
        setViewingDetail(detail.data);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payment status.");
    }
  };

  const handleRecordPayment = async () => {
    if (!token || !viewing) return;
    const amt = Number(paymentAmount.replace(/,/g, ".").trim());
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    setRecordingPayment(true);
    try {
      const res = await recordInvoicePaymentRequest(token, viewing.id, {
        amount: amt,
        paid_at: paymentPaidAt || undefined,
        note: paymentNote.trim() || undefined,
      });
      setList((prev) => prev.map((inv) => (String(inv.id) === String(viewing.id) ? res.data : inv)));
      setViewingDetail(res.data);
      setPaymentAmount("");
      setPaymentNote("");
      setPaymentPaidAt(new Date().toISOString().slice(0, 10));
      toast.success("Payment recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record payment.");
    } finally {
      setRecordingPayment(false);
    }
  };

  const openPaymentEditor = (p: InvoicePaymentApi) => {
    setPaymentEdit(p);
    setEditPayAmount(String(p.amount ?? ""));
    const raw = p.paid_at != null && p.paid_at !== "" ? String(p.paid_at) : "";
    setEditPayPaidAt(raw.length >= 10 ? raw.slice(0, 10) : "");
    setEditPayNote(p.note ?? "");
  };

  const handleSavePaymentEdit = async () => {
    if (!token || !viewing || !paymentEdit) return;
    const amt = Number(editPayAmount.replace(/,/g, ".").trim());
    if (!Number.isFinite(amt) || amt < 0.01) {
      toast.error("Enter a valid payment amount (minimum 0.01).");
      return;
    }
    setUpdatingPayment(true);
    try {
      const res = await updateInvoicePaymentRequest(token, viewing.id, paymentEdit.id, {
        amount: amt,
        paid_at: editPayPaidAt.trim() === "" ? null : editPayPaidAt.trim(),
        note: editPayNote.trim() === "" ? null : editPayNote.trim(),
      });
      setList((prev) => prev.map((inv) => (String(inv.id) === String(viewing.id) ? res.data : inv)));
      setViewingDetail(res.data);
      setPaymentEdit(null);
      toast.success("Payment updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update payment.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleDelete = async (invoiceId: string | number) => {
    if (!token) return;
    try {
      await deleteInvoiceRequest(token, invoiceId);
      setList((prev) => prev.filter((invoice) => String(invoice.id) !== String(invoiceId)));
      if (viewId === String(invoiceId)) setViewId(null);
      toast.success("Invoice deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete invoice.");
    }
  };

  const paymentBadge = (status: InvoiceApi["payment_status"]) => {
    if (status === "paid") return "bg-success text-success-foreground hover:bg-success";
    if (status === "partial") return "bg-warning text-warning-foreground hover:bg-warning";
    return "bg-muted text-muted-foreground hover:bg-muted";
  };

  const openPrintableInvoice = (invoice: InvoiceApi) => {
    const customer = customers.find((c) => String(c.id) === String(invoice.customer_id));
    const car = cars.find((c) => String(c.id) === String(invoice.car_id));
    const amountPaid = invoiceAmountPaid(invoice);
    const balanceDue = invoiceAmountDue(invoice);
    const printedAt = new Date();
    const rows = invoice.items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description}</td>
            <td style="text-align:right;">${item.quantity}</td>
            <td style="text-align:right;">${formatTzs(item.unit_price)}</td>
            <td style="text-align:right;">${formatTzs(item.line_total)}</td>
          </tr>`,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print invoice.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            .top { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
            .logo { width: 200px; height: auto; margin-bottom: 12px; }
            .invoice-title { margin: 0; color: #d60000; font-size: 32px; font-weight: 800; text-align: right; }
            .muted { color: #555; font-size: 12px; margin: 3px 0; }
            .label { font-weight: 700; font-size: 13px; margin-top: 8px; }
            .block { margin-top: 12px; }
            .from, .to { font-size: 13px; line-height: 1.55; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #d60000; color: #fff; text-align: left; }
            th:first-child, td:first-child { width: 34px; text-align: center; }
            th:nth-child(2), td:nth-child(2) { padding-left: 12px; }
            .bottom { display: grid; grid-template-columns: 1fr 320px; gap: 16px; margin-top: 18px; align-items: start; }
            .summary { border: 1px solid #111; padding: 10px; font-size: 12px; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
            .summary-row:last-child { border-bottom: 0; font-weight: 700; }
            .terms { font-size: 12px; line-height: 1.5; }
            .terms ul { margin: 6px 0 0 16px; padding: 0; }
          </style>
        </head>
        <body>
          <div class="top">
            <div>
              <img class="logo" src="/aziziumemelogo.png" alt="AZIZI AUTOMOTIVE GARAGE logo" />
              <div class="label">INVOICE TO:</div>
              <div class="to">
                <div>${customer?.name ?? "—"}</div>
                <div>Car Reg: ${car?.plate_number ?? "—"}</div>
                <div>Car Name: ${car?.vehicle_type ?? "—"} (${car?.color ?? "—"})</div>
                <div>${customer?.phone ?? "—"}</div>
                <div>DAR ES SALAAM</div>
              </div>
            </div>
            <div>
              <h1 class="invoice-title">INVOICE</h1>
              <p class="muted"><strong>Invoice REF:</strong> ${invoice.invoice_number}</p>
              <p class="muted"><strong>Date:</strong> ${formatInvoiceDateLong(invoice.date)}</p>
              <div class="block">
                <div class="label">INVOICE FROM:</div>
                <div class="from">
                  <div>${GARAGE_NAME}</div>
                  <div>${GARAGE_PHONE}</div>
                  <div>${GARAGE_EMAIL}</div>
                  <div>${GARAGE_LOCATION}</div>
                  <div>TIN: ${GARAGE_TIN}</div>
                  <div class="muted">Printed: ${formatInvoiceDateLong(printedAt)}, ${printedAt.toLocaleTimeString()} by ${user?.name ?? "System User"}</div>
                </div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Price (TZS)</th>
                <th style="text-align:right;">Total (TZS)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="bottom">
            <div class="terms">
              <strong>PAYMENT DETAILS:</strong>
              <div>${PAYMENT_ACCOUNT}</div>
              <div>${PAYMENT_ACCOUNT_NAME}</div>
              <div style="margin-top:8px;"><strong>TERMS & CONDITIONS</strong></div>
              <ul>
                <li>Extra repairs not listed in the quote will be charged separately.</li>
                <li>Please collect removed parts within 7 days of repair.</li>
                <li>80% of the payment is due upfront, with the remaining balance payable upon completion of the service.</li>
                <li>Storage fees may apply for pickups made after 7 days.</li>
              </ul>
            </div>
            <div class="summary">
              <div class="summary-row"><span>Subtotal</span><span>${formatTzs(invoice.total)}</span></div>
              <div class="summary-row"><span>Total Amount</span><span>${formatTzs(invoice.total)} TZS</span></div>
              <div class="summary-row"><span>Amount Paid</span><span>${formatTzs(amountPaid)}</span></div>
              <div class="summary-row"><span>Balance Due</span><span>${formatTzs(balanceDue)}</span></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadInvoicePdf = async (invoice: InvoiceApi) => {
    const customer = customers.find((c) => String(c.id) === String(invoice.customer_id));
    const car = cars.find((c) => String(c.id) === String(invoice.car_id));
    const amountPaid = invoiceAmountPaid(invoice);
    const balanceDue = invoiceAmountDue(invoice);
    const printedAt = new Date();
    const logoDataUrl = await loadLogoDataUrl();

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = 12;

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", 14, y, 48, 18);
      } catch {
        // keep generating the invoice even if logo rendering fails
      }
    }

    doc.setTextColor(214, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("INVOICE", 196, y + 8, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Invoice REF: ${invoice.invoice_number}`, 196, y + 14, { align: "right" });
    doc.text(`Date: ${formatInvoiceDateLong(invoice.date)}`, 196, y + 20, { align: "right" });

    y = 36;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INVOICE TO:", 14, y);
    doc.text("INVOICE FROM:", 108, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const leftLines = [
      customer?.name ?? "—",
      `Car Reg: ${car?.plate_number ?? "—"}`,
      `Car Name: ${car?.vehicle_type ?? "—"} (${car?.color ?? "—"})`,
      customer?.phone ?? "—",
      "DAR ES SALAAM",
    ];
    leftLines.forEach((line, idx) => doc.text(line, 14, y + 6 + idx * 5));

    const rightLines = [
      GARAGE_NAME,
      GARAGE_PHONE,
      GARAGE_EMAIL,
      GARAGE_LOCATION,
      `TIN: ${GARAGE_TIN}`,
      `Printed: ${formatInvoiceDateLong(printedAt)}, ${printedAt.toLocaleTimeString()}`,
      `By: ${user?.name ?? "System User"}`,
    ];
    rightLines.forEach((line, idx) => doc.text(line, 108, y + 6 + idx * 5));

    y += 44;

    doc.setFont("helvetica", "bold");
    doc.setFillColor(214, 0, 0);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, y, 182, 8, "F");
    doc.text("#", 20, y + 5.5);
    doc.text("Item", 32, y + 5.5);
    doc.text("Qty", 132, y + 5.5, { align: "right" });
    doc.text("Price (TZS)", 162, y + 5.5, { align: "right" });
    doc.text("Total (TZS)", 193, y + 5.5, { align: "right" });
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    for (const [index, item] of invoice.items.entries()) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const descLines = doc.splitTextToSize(item.description, 96);
      const rowHeight = Math.max(6, descLines.length * 5);
      doc.text(String(index + 1), 20, y + 4);
      doc.text(descLines, 32, y + 4);
      doc.text(String(item.quantity), 132, y + 4, { align: "right" });
      doc.text(formatTzs(item.unit_price), 162, y + 4, { align: "right" });
      doc.text(formatTzs(item.line_total), 193, y + 4, { align: "right" });
      y += rowHeight;
      doc.setDrawColor(235, 235, 235);
      doc.line(14, y, 196, y);
      y += 2;
    }

    y += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.text("PAYMENT DETAILS:", 14, y + 4);
    doc.text(PAYMENT_ACCOUNT, 14, y + 9);
    doc.text(PAYMENT_ACCOUNT_NAME, 14, y + 14);
    doc.text("TERMS & CONDITIONS", 14, y + 20);
    const terms = [
      "Extra repairs not listed in the quote will be charged separately.",
      "Please collect removed parts within 7 days of repair.",
      "80% of the payment is due upfront, remaining on completion.",
      "Storage fees may apply for pickups made after 7 days.",
    ];
    terms.forEach((term, idx) => doc.text(`- ${term}`, 14, y + 25 + idx * 4.6));

    const boxX = 130;
    const boxY = y + 2;
    const boxW = 66;
    const rowH = 7;
    doc.setDrawColor(0, 0, 0);
    doc.rect(boxX, boxY, boxW, rowH * 4 + 2);
    const summaryRows = [
      ["Subtotal", formatTzs(invoice.total)],
      ["Total Amount", `${formatTzs(invoice.total)} TZS`],
      ["Amount Paid", formatTzs(amountPaid)],
      ["Balance Due", formatTzs(balanceDue)],
    ] as const;
    summaryRows.forEach(([label, value], idx) => {
      const lineY = boxY + 6 + idx * rowH;
      if (idx > 0) doc.line(boxX, boxY + 2 + idx * rowH, boxX + boxW, boxY + 2 + idx * rowH);
      doc.text(label, boxX + 2, lineY);
      doc.text(value, boxX + boxW - 2, lineY, { align: "right" });
    });

    doc.save(`${invoice.invoice_number.replace(/[^\w.-]+/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Generate and manage invoices. Record payments; amount paid and due update from the server."
        actions={
          <>
            <Dialog
              open={invoiceDialogOpen}
              onOpenChange={(o) => {
                setInvoiceDialogOpen(o);
                if (!o) resetInvoiceForm();
              }}
            >
              <Button
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-md"
                onClick={() => openCreateDialog()}
              >
                <Plus className="mr-2 h-5 w-5" /> New Invoice
              </Button>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{editingInvoiceId ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleInvoiceSubmit}>
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
                    <p className="text-xs text-muted-foreground">
                      Invoice numbers are generated on the server when you save. You do not need to enter one.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Customer *</Label>
                      <Select
                        value={customerId}
                        onValueChange={(v) => { setCustomerId(v); setCarId(""); setServiceId(""); }}
                        open={customerSelectOpen}
                        onOpenChange={setCustomerSelectOpen}
                      >
                        <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              value={customerSearch}
                              onChange={(e) => setCustomerSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="Search customer"
                            />
                          </div>
                          {customerOptions.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Car *</Label>
                      <Select
                        value={carId}
                        onValueChange={(v) => { setCarId(v); setServiceId(""); }}
                        disabled={!customerId}
                        open={carSelectOpen}
                        onOpenChange={setCarSelectOpen}
                      >
                        <SelectTrigger><SelectValue placeholder={customerId ? "Select car" : "Select customer first"} /></SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              value={carSearch}
                              onChange={(e) => setCarSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="Search car plate"
                            />
                          </div>
                          {carOptions.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.plate_number}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Service (optional)</Label>
                      <Select
                        value={serviceId}
                        onValueChange={setServiceId}
                        disabled={!carId}
                        open={serviceSelectOpen}
                        onOpenChange={setServiceSelectOpen}
                      >
                        <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              value={serviceSearch}
                              onChange={(e) => setServiceSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="Search service"
                            />
                          </div>
                          {serviceOptions.map((service) => (
                            <SelectItem key={service.id} value={String(service.id)}>
                              {formatDate(service.date)} - {service.problem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>Line items (order is preserved)</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setDraftLines((p) => [...p, emptyStockLine()])}>
                          <Plus className="mr-1 h-4 w-4" /> Stock line
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setDraftLines((p) => [...p, emptyCustomLine()])}>
                          <Plus className="mr-1 h-4 w-4" /> Custom / labour
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quantity: enter a positive number, or a label such as SET. Optional line total overrides the calculated total when quantity is not a simple multiplier.
                    </p>
                    <div className="space-y-3">
                      {draftLines.map((line, idx) => (
                        <div key={`line-${idx}`} className="rounded-md border p-3 space-y-2">
                          {line.kind === "stock" ? (
                            <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-end">
                              <div className="lg:col-span-5 space-y-1">
                                <Label className="text-xs">Stock part</Label>
                                <Select
                                  value={line.stock_id}
                                  onValueChange={(value) => updateDraftLine(idx, { stock_id: value })}
                                  open={stockSelectOpen}
                                  onOpenChange={setStockSelectOpen}
                                >
                                  <SelectTrigger><SelectValue placeholder="Select stock" /></SelectTrigger>
                                  <SelectContent>
                                    <div className="p-2">
                                      <Input
                                        value={stockSearch}
                                        onChange={(e) => setStockSearch(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Search stock"
                                      />
                                    </div>
                                    {stockOptions.map((stock) => (
                                      <SelectItem key={stock.id} value={String(stock.id)}>{stock.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="lg:col-span-2 space-y-1">
                                <Label className="text-xs">Qty (number or SET)</Label>
                                <Input
                                  value={line.quantity}
                                  onChange={(e) => updateDraftLine(idx, { quantity: e.target.value })}
                                  placeholder="e.g. 2 or SET"
                                />
                              </div>
                              <div className="lg:col-span-3 space-y-1">
                                <Label className="text-xs">Line total (optional)</Label>
                                <Input
                                  value={line.line_total}
                                  onChange={(e) => updateDraftLine(idx, { line_total: e.target.value })}
                                  placeholder="Override total"
                                />
                              </div>
                              <div className="lg:col-span-2 flex justify-end">
                                <Button type="button" variant="ghost" size="icon" onClick={() => setDraftLines((p) => p.filter((_, i) => i !== idx))}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-end">
                              <div className="lg:col-span-4 space-y-1">
                                <Label className="text-xs">Description</Label>
                                <Input
                                  value={line.description}
                                  onChange={(e) => updateDraftLine(idx, { description: e.target.value })}
                                  placeholder="Description"
                                />
                              </div>
                              <div className="lg:col-span-2 space-y-1">
                                <Label className="text-xs">Qty (number or SET)</Label>
                                <Input
                                  value={line.quantity}
                                  onChange={(e) => updateDraftLine(idx, { quantity: e.target.value })}
                                  placeholder="e.g. 2 or SET"
                                />
                              </div>
                              <div className="lg:col-span-2 space-y-1">
                                <Label className="text-xs">Unit price</Label>
                                <Input
                                  value={line.unit_price}
                                  onChange={(e) => updateDraftLine(idx, { unit_price: e.target.value })}
                                  placeholder="0"
                                />
                              </div>
                              <div className="lg:col-span-2 space-y-1">
                                <Label className="text-xs">Line total (optional)</Label>
                                <Input
                                  value={line.line_total}
                                  onChange={(e) => updateDraftLine(idx, { line_total: e.target.value })}
                                  placeholder="Override"
                                />
                              </div>
                              <div className="lg:col-span-1 space-y-1">
                                <Label className="text-xs">Type</Label>
                                <Select
                                  value={line.item_type}
                                  onValueChange={(v) => updateDraftLine(idx, { item_type: v as "labor" | "custom" })}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="custom">Custom</SelectItem>
                                    <SelectItem value="labor">Labor</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="lg:col-span-1 flex justify-end">
                                <Button type="button" variant="ghost" size="icon" onClick={() => setDraftLines((p) => p.filter((_, i) => i !== idx))}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {stocks.length === 0 && <p className="text-xs text-muted-foreground">No stock items in catalog yet.</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Payment status</Label>
                    <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as "unpaid" | "partial" | "paid")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Amount paid and amount due follow recorded payments. Open the invoice view to add payments or edit an existing payment row; use status here or in the list when you need the label to match reality.
                    </p>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setInvoiceDialogOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                      {submitting ? "Saving..." : editingInvoiceId ? "Update invoice" : "Save invoice"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search by invoice #, customer, plate..." />
            <ExportActions entity="invoices" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Paid</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Due</TableHead>
                <TableHead className="hidden sm:table-cell">Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading invoices...</span>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((invoice) => {
                const customer = customers.find((c) => String(c.id) === String(invoice.customer_id));
                const car = cars.find((c) => String(c.id) === String(invoice.car_id));
                const paid = invoiceAmountPaid(invoice);
                const due = invoiceAmountDue(invoice);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-semibold">{invoice.invoice_number}</TableCell>
                    <TableCell>{formatDate(invoice.date)}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer?.name}</TableCell>
                    <TableCell>
                      <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{car?.plate_number}</span>
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-muted-foreground">{formatCurrency(paid)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right font-medium">{formatCurrency(due)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Select value={invoice.payment_status} onValueChange={(v) => void handlePaymentStatus(invoice.id, v as "unpaid" | "partial" | "paid")}>
                        <SelectTrigger className="h-8 min-w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                        <Badge className={`hidden md:inline-flex ${paymentBadge(invoice.payment_status)}`}>{invoice.payment_status}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => setViewId(String(invoice.id))}>
                          <Eye className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void openEditDialog(invoice)}>
                          <Pencil className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadInvoicePdf(invoice)}>
                          <Download className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">PDF</span>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void handleDelete(invoice.id)}>
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
                            <DropdownMenuItem onClick={() => setViewId(String(invoice.id))}>View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void openEditDialog(invoice)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadInvoicePdf(invoice)}>PDF</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void handleDelete(invoice.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DataCard>

      <Dialog open={!!viewId} onOpenChange={(value) => !value && setViewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Invoice {viewing?.invoice_number}</DialogTitle></DialogHeader>
          {viewLoading && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!viewLoading && viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Bill To</p>
                  <p className="font-semibold">{viewCustomer?.name}</p>
                  <p className="text-xs text-muted-foreground">{viewCustomer?.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-semibold">{viewCar?.plate_number}</p>
                  <p className="text-xs text-muted-foreground">Date: {formatDate(viewing.date)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-md border p-2">
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-semibold">{formatCurrency(viewing.total)}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-muted-foreground text-xs">Amount paid</p>
                  <p className="font-semibold">{formatCurrency(invoiceAmountPaid(viewing))}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-muted-foreground text-xs">Amount due</p>
                  <p className="font-semibold text-primary">{formatCurrency(invoiceAmountDue(viewing))}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge className={paymentBadge(viewing.payment_status)}>{viewing.payment_status}</Badge>
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-sm font-semibold">Update payment status</Label>
                <p className="text-xs text-muted-foreground">
                  Updates the status label on the server. Amount paid and amount due follow the payment entries below—use Record payment to add installments, or Edit on a row to change an existing payment.
                </p>
                <Select
                  value={viewing.payment_status}
                  onValueChange={(v) => void handlePaymentStatus(viewing.id, v as "unpaid" | "partial" | "paid")}
                >
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-sm font-semibold">Record payment</Label>
                <p className="text-xs text-muted-foreground">
                  Each save adds an installment and refreshes amount paid and amount due from the server.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <Input type="date" value={paymentPaidAt} onChange={(e) => setPaymentPaidAt(e.target.value)} />
                  <Input placeholder="Note (optional)" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
                </div>
                <Button type="button" size="sm" className="bg-gradient-primary" disabled={recordingPayment || invoiceAmountDue(viewing) <= 0} onClick={() => void handleRecordPayment()}>
                  {recordingPayment ? "Recording…" : "Add payment"}
                </Button>
              </div>

              {viewing.payments && viewing.payments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Payments</p>
                  <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                    {viewing.payments.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
                        <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
                          <span className="text-muted-foreground">{p.paid_at ? formatDate(String(p.paid_at)) : "—"}</span>
                          <span className="font-mono font-semibold">{formatCurrency(p.amount)}</span>
                          <span className="truncate text-muted-foreground">{p.note ?? "—"}</span>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => openPaymentEditor(p)}>
                          Edit
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewing.items.map((item, index) => (
                    <TableRow key={`${item.description}-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-lg font-bold">Total</TableCell>
                    <TableCell className="text-right text-lg font-bold text-primary">{formatCurrency(viewing.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => void openEditDialog(viewing)}>Edit invoice</Button>
                <Button variant="outline" onClick={() => openPrintableInvoice(viewing)}>Print</Button>
                <Button className="bg-gradient-primary" onClick={() => downloadInvoicePdf(viewing)}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!paymentEdit}
        onOpenChange={(open) => {
          if (!open) setPaymentEdit(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit payment</DialogTitle>
          </DialogHeader>
          {paymentEdit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editPayAmount}
                  onChange={(e) => setEditPayAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Paid on</Label>
                <Input type="date" value={editPayPaidAt} onChange={(e) => setEditPayPaidAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Input value={editPayNote} onChange={(e) => setEditPayNote(e.target.value)} placeholder="Optional" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentEdit(null)} disabled={updatingPayment}>
                  Cancel
                </Button>
                <Button type="button" className="bg-gradient-primary" disabled={updatingPayment} onClick={() => void handleSavePaymentEdit()}>
                  {updatingPayment ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
