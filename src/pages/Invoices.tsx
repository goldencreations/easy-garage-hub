import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Eye, FileCheck, Loader2, Plus, Trash2, MoreHorizontal, Pencil } from "lucide-react";
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
  convertProformaToInvoiceRequest,
  createProformaRequest,
  deleteProformaRequest,
  getInvoiceRequest,
  getProformaRequest,
  listCarsRequest,
  listCustomersRequest,
  listInvoicesRequest,
  listProformasRequest,
  listServicesRequest,
  listStocksRequest,
  updateProformaRequest,
  type CarApi,
  type CustomerApi,
  type InvoiceApi,
  type InvoiceItemApi,
  type InvoiceItemPayload,
  type ProformaApi,
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

function documentPdfFilename(docNumber: string, customerName?: string | null) {
  const safe = (value: string) =>
    value
      .trim()
      .replace(/[^\w\s-]+/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "document";
  const parts = [customerName, docNumber].filter((part) => part && String(part).trim());
  return `${parts.map((part) => safe(String(part))).join("_")}.pdf`;
}

function computeDraftLineTotal(line: DraftLine, stockById: Map<string, StockApi>): number {
  if (line.kind === "stock") {
    const override = parseOptionalAmount(line.line_total);
    if (override !== undefined) return override;
    const stock = stockById.get(String(line.stock_id));
    const qtyNorm = line.quantity.trim().replace(/,/g, ".");
    const qty = Number(qtyNorm);
    const price = Number(stock?.price ?? 0);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(price)) return qty * price;
    return 0;
  }
  const override = parseOptionalAmount(line.line_total);
  if (override !== undefined) return override;
  const qtyNorm = line.quantity.trim().replace(/,/g, ".");
  const qty = Number(qtyNorm);
  const unit = Number(line.unit_price.replace(/,/g, "."));
  if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unit)) return qty * unit;
  return 0;
}

function computeDraftTotal(lines: DraftLine[], stockById: Map<string, StockApi>): number {
  return lines.reduce((sum, line) => sum + computeDraftLineTotal(line, stockById), 0);
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

type BillableDoc = InvoiceApi | ProformaApi;

function docNumber(doc: BillableDoc): string {
  return "proforma_number" in doc ? doc.proforma_number : doc.invoice_number;
}

function docTitle(doc: BillableDoc): string {
  if ("title" in doc && doc.title) return doc.title;
  return "proforma_number" in doc ? "Proforma" : "Invoice";
}

type InvoicesPageProps = {
  mode: "proformas" | "invoices";
};

export default function Invoices({ mode }: InvoicesPageProps) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "super_admin";
  const canEditProforma = (proforma: ProformaApi) => proforma.status === "draft" || isSuperAdmin;
  const canDeleteProforma = (proforma: ProformaApi) => proforma.status === "draft" || isSuperAdmin;
  const [proformaList, setProformaList] = useState<ProformaApi[]>([]);
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
  const [editingProformaId, setEditingProformaId] = useState<string | null>(null);
  const [viewProformaId, setViewProformaId] = useState<string | null>(null);
  const [viewingProformaDetail, setViewingProformaDetail] = useState<ProformaApi | null>(null);
  const [viewProformaLoading, setViewProformaLoading] = useState(false);
  const [convertTarget, setConvertTarget] = useState<ProformaApi | null>(null);
  const [convertPaymentStatus, setConvertPaymentStatus] = useState<"unpaid" | "partial" | "paid">("paid");
  const [convertDate, setConvertDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [converting, setConverting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [carId, setCarId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draftLines, setDraftLines] = useState<DraftLine[]>([emptyCustomLine()]);

  const resetInvoiceForm = () => {
    setEditingProformaId(null);
    setCustomerId("");
    setCarId("");
    setServiceId("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setDraftLines([emptyCustomLine()]);
  };

  const openCreateDialog = () => {
    resetInvoiceForm();
    setInvoiceDialogOpen(true);
  };

  const openEditProformaDialog = async (proforma: ProformaApi) => {
    if (!token) return;
    if (!canEditProforma(proforma)) {
      toast.error("Converted proformas cannot be edited.");
      return;
    }
    setViewProformaId(null);
    setSubmitting(true);
    try {
      const res = await getProformaRequest(token, proforma.id);
      const pf = res.data;
      setEditingProformaId(String(pf.id));
      setCustomerId(String(pf.customer_id));
      setCarId(String(pf.car_id));
      setServiceId(pf.service_id != null ? String(pf.service_id) : "");
      setInvoiceDate(String(pf.date).slice(0, 10));
      const lines = draftLinesFromInvoiceItems(pf.items ?? []);
      setDraftLines(lines.length ? lines : [emptyCustomLine()]);
      setInvoiceDialogOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load proforma.");
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
        const sharedRequests = [
          listCustomersRequest(token),
          listCarsRequest(token),
          listServicesRequest(token),
          listStocksRequest(token),
        ] as const;
        const docRequests =
          mode === "proformas"
            ? [listProformasRequest(token), ...sharedRequests]
            : [listInvoicesRequest(token), ...sharedRequests];
        const results = await Promise.all(docRequests);
        if (mode === "proformas") {
          setProformaList(results[0].data as ProformaApi[]);
        } else {
          setList(results[0].data as InvoiceApi[]);
        }
        const customersRes = results[1];
        const carsRes = results[2];
        const servicesRes = results[3];
        const stocksRes = results[4];
        setCustomers(customersRes.data);
        setCars(carsRes.data);
        setServices(servicesRes.data);
        setStocks(stocksRes.data);
        setCustomerOptions(customersRes.data);
        setCarOptions(carsRes.data);
        setServiceOptions(servicesRes.data);
        setStockOptions(stocksRes.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load documents.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token, mode]);

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

  useEffect(() => {
    const loadProformaView = async () => {
      if (!token || !viewProformaId) {
        setViewingProformaDetail(null);
        return;
      }
      setViewProformaLoading(true);
      try {
        const res = await getProformaRequest(token, viewProformaId);
        setViewingProformaDetail(res.data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load proforma.");
        setViewingProformaDetail(null);
      } finally {
        setViewProformaLoading(false);
      }
    };
    void loadProformaView();
  }, [token, viewProformaId]);

  const customerById = useMemo(() => new Map(customers.map((c) => [String(c.id), c])), [customers]);
  const carById = useMemo(() => new Map(cars.map((c) => [String(c.id), c])), [cars]);
  const stockById = useMemo(() => new Map(stocks.map((s) => [String(s.id), s])), [stocks]);

  const filteredProformas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return proformaList;
    return proformaList.filter((proforma) => {
      const customer = proforma.customer ?? customerById.get(String(proforma.customer_id));
      const car = proforma.car ?? carById.get(String(proforma.car_id));
      const blob = [proforma.proforma_number, customer?.name, car?.plate_number, car?.vehicle_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [proformaList, query, customerById, carById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((invoice) => {
      const customer = invoice.customer ?? customerById.get(String(invoice.customer_id));
      const car = invoice.car ?? carById.get(String(invoice.car_id));
      const blob = [
        invoice.invoice_number,
        customer?.name,
        car?.plate_number,
        car?.vehicle_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [list, query, customerById, carById]);

  const draftTotalPreview = useMemo(() => computeDraftTotal(draftLines, stockById), [draftLines, stockById]);

  const editingProforma = useMemo(
    () => (editingProformaId ? proformaList.find((pf) => String(pf.id) === editingProformaId) ?? null : null),
    [editingProformaId, proformaList],
  );

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

  const handleProformaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!customerId || !carId) {
      toast.error("Select customer and car");
      return;
    }
    const proforma_items = buildInvoiceItemsPayloadFromDraft(draftLines, stockById);
    if (proforma_items.length === 0) {
      toast.error("Add at least one line with valid quantity (number or SET).");
      return;
    }

    setSubmitting(true);
    try {
      if (editingProformaId) {
        const response = await updateProformaRequest(token, editingProformaId, {
          date: invoiceDate,
          customer_id: customerId,
          car_id: carId,
          service_id: serviceId || null,
          proforma_items,
        });
        setProformaList((prev) => prev.map((pf) => (String(pf.id) === editingProformaId ? response.data : pf)));
        if (viewProformaId === editingProformaId) setViewingProformaDetail(response.data);
        toast.success("Proforma updated");
      } else {
        const response = await createProformaRequest(token, {
          date: invoiceDate,
          customer_id: customerId,
          car_id: carId,
          ...(serviceId ? { service_id: serviceId } : {}),
          proforma_items,
        });
        setProformaList((prev) => [response.data, ...prev]);
        toast.success("Proforma created");
      }
      setInvoiceDialogOpen(false);
      resetInvoiceForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save proforma.");
    } finally {
      setSubmitting(false);
    }
  };

  const openConvertDialog = (proforma: ProformaApi) => {
    if (proforma.status === "converted") {
      toast.info("This proforma is already converted.");
      return;
    }
    setConvertTarget(proforma);
    setConvertPaymentStatus("paid");
    setConvertDate(new Date().toISOString().slice(0, 10));
  };

  const handleConvertToInvoice = async () => {
    if (!token || !convertTarget) return;
    setConverting(true);
    try {
      const res = await convertProformaToInvoiceRequest(token, convertTarget.id, {
        payment_status: convertPaymentStatus,
        date: convertDate,
      });
      setProformaList((prev) =>
        prev.map((pf) =>
          String(pf.id) === String(convertTarget.id)
            ? { ...pf, status: "converted" as const, invoice: res.data }
            : pf,
        ),
      );
      setList((prev) => [res.data, ...prev.filter((inv) => String(inv.id) !== String(res.data.id))]);
      if (viewProformaId === String(convertTarget.id)) {
        const detail = await getProformaRequest(token, convertTarget.id);
        setViewingProformaDetail(detail.data);
      }
      setConvertTarget(null);
      toast.success("Proforma converted to invoice");
      navigate("/invoices");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not convert proforma.");
    } finally {
      setConverting(false);
    }
  };

  const handleDeleteProforma = async (proformaId: string | number) => {
    if (!token) return;
    try {
      await deleteProformaRequest(token, proformaId);
      setProformaList((prev) => prev.filter((pf) => String(pf.id) !== String(proformaId)));
      if (viewProformaId === String(proformaId)) setViewProformaId(null);
      toast.success("Proforma deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete proforma.");
    }
  };

  const paymentBadge = (status: InvoiceApi["payment_status"]) => {
    if (status === "paid") return "bg-success text-success-foreground hover:bg-success";
    if (status === "partial") return "bg-warning text-warning-foreground hover:bg-warning";
    return "bg-muted text-muted-foreground hover:bg-muted";
  };

  const viewingProforma = viewProformaId
    ? (viewingProformaDetail ?? proformaList.find((pf) => String(pf.id) === viewProformaId) ?? null)
    : null;
  const viewProformaCustomer = viewingProforma
    ? customers.find((c) => String(c.id) === String(viewingProforma.customer_id))
    : null;
  const viewProformaCar = viewingProforma ? cars.find((c) => String(c.id) === String(viewingProforma.car_id)) : null;

  const openPrintableDocument = (doc: BillableDoc) => {
    const customer = customers.find((c) => String(c.id) === String(doc.customer_id));
    const car = cars.find((c) => String(c.id) === String(doc.car_id));
    const title = docTitle(doc).toUpperCase();
    const refLabel = "proforma_number" in doc ? "Proforma REF" : "Invoice REF";
    const number = docNumber(doc);
    const invoice = "invoice_number" in doc ? doc : null;
    const amountPaid = invoice ? invoiceAmountPaid(invoice) : 0;
    const balanceDue = invoice ? invoiceAmountDue(invoice) : Number(doc.total) || 0;
    const printedAt = new Date();
    const rows = doc.items
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
      toast.error("Popup blocked. Please allow popups to print document.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title} ${number}</title>
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
              <h1 class="invoice-title">${title}</h1>
              <p class="muted"><strong>${refLabel}:</strong> ${number}</p>
              <p class="muted"><strong>Date:</strong> ${formatInvoiceDateLong(doc.date)}</p>
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
              <div class="summary-row"><span>Subtotal</span><span>${formatTzs(doc.total)}</span></div>
              <div class="summary-row"><span>Total Amount</span><span>${formatTzs(doc.total)} TZS</span></div>
              ${invoice ? `<div class="summary-row"><span>Amount Paid</span><span>${formatTzs(amountPaid)}</span></div>
              <div class="summary-row"><span>Balance Due</span><span>${formatTzs(balanceDue)}</span></div>` : ""}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadDocumentPdf = async (billable: BillableDoc) => {
    const customer = customers.find((c) => String(c.id) === String(billable.customer_id));
    const car = cars.find((c) => String(c.id) === String(billable.car_id));
    const title = docTitle(billable).toUpperCase();
    const refLabel = "proforma_number" in billable ? "Proforma REF" : "Invoice REF";
    const number = docNumber(billable);
    const invoice = "invoice_number" in billable ? billable : null;
    const amountPaid = invoice ? invoiceAmountPaid(invoice) : 0;
    const balanceDue = invoice ? invoiceAmountDue(invoice) : Number(billable.total) || 0;
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
    doc.text(title, 196, y + 8, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${refLabel}: ${number}`, 196, y + 14, { align: "right" });
    doc.text(`Date: ${formatInvoiceDateLong(billable.date)}`, 196, y + 20, { align: "right" });

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

    for (const [index, item] of billable.items.entries()) {
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
    const summaryRows = invoice
      ? ([
          ["Subtotal", formatTzs(billable.total)],
          ["Total Amount", `${formatTzs(billable.total)} TZS`],
          ["Amount Paid", formatTzs(amountPaid)],
          ["Balance Due", formatTzs(balanceDue)],
        ] as const)
      : ([
          ["Subtotal", formatTzs(billable.total)],
          ["Total Amount", `${formatTzs(billable.total)} TZS`],
        ] as const);
    doc.rect(boxX, boxY, boxW, rowH * summaryRows.length + 2);
    summaryRows.forEach(([label, value], idx) => {
      const lineY = boxY + 6 + idx * rowH;
      if (idx > 0) doc.line(boxX, boxY + 2 + idx * rowH, boxX + boxW, boxY + 2 + idx * rowH);
      doc.text(label, boxX + 2, lineY);
      doc.text(value, boxX + boxW - 2, lineY, { align: "right" });
    });

    doc.save(documentPdfFilename(number, customer?.name));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "proformas" ? "Proformas" : "Invoices"}
        description={
          mode === "proformas"
            ? "Create and edit draft proformas. Convert to an invoice after the customer pays."
            : "Final invoices from converted proformas. View, print, or download only."
        }
        actions={
          mode === "proformas" ? (
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
                <Plus className="mr-2 h-5 w-5" /> New Proforma
              </Button>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProformaId
                      ? editingProforma?.status === "converted"
                        ? "Edit converted proforma"
                        : "Edit Proforma"
                      : "Create New Proforma"}
                  </DialogTitle>
                  {editingProforma?.status === "converted" && isSuperAdmin && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Super admin only — this proforma is already linked to an invoice.
                    </p>
                  )}
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleProformaSubmit}>
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
                    <p className="text-xs text-muted-foreground">
                      Proforma numbers are generated on the server when you save.
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

                  <div className="rounded-lg border bg-muted/40 p-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">Estimated total (preview)</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(draftTotalPreview)}</span>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setInvoiceDialogOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                      {submitting ? "Saving..." : editingProformaId ? "Update proforma" : "Save proforma"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {mode === "proformas" ? (
          <DataCard
            actions={
              <>
                <SearchBar value={query} onChange={setQuery} placeholder="Search proforma #, customer, plate..." />
                <ExportActions entity="proformas" />
              </>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proforma #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden md:table-cell">Customer</TableHead>
                    <TableHead>Car</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading proformas...</span>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredProformas.map((proforma) => {
                    const customer = proforma.customer ?? customerById.get(String(proforma.customer_id));
                    const car = proforma.car ?? carById.get(String(proforma.car_id));
                    return (
                      <TableRow key={proforma.id}>
                        <TableCell className="font-mono font-semibold">{proforma.proforma_number}</TableCell>
                        <TableCell>{formatDate(proforma.date)}</TableCell>
                        <TableCell className="hidden md:table-cell">{customer?.name}</TableCell>
                        <TableCell>
                          <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{car?.plate_number}</span>
                        </TableCell>
                        <TableCell className="font-bold">{formatCurrency(proforma.total)}</TableCell>
                        <TableCell>
                          <Badge variant={proforma.status === "converted" ? "secondary" : "outline"}>
                            {proforma.status === "converted" ? "Converted" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                            <Button size="sm" variant="ghost" onClick={() => setViewProformaId(String(proforma.id))}>
                              <Eye className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            {canEditProforma(proforma) && (
                              <Button size="sm" variant="ghost" onClick={() => void openEditProformaDialog(proforma)}>
                                <Pencil className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                            {proforma.status === "draft" && (
                              <Button size="sm" variant="ghost" title="Convert to invoice" onClick={() => openConvertDialog(proforma)}>
                                <FileCheck className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">To invoice</span>
                              </Button>
                            )}
                            {canDeleteProforma(proforma) && (
                              <Button size="icon" variant="ghost" onClick={() => void handleDeleteProforma(proforma.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => downloadDocumentPdf(proforma)}>
                              <Download className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">PDF</span>
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
                                <DropdownMenuItem onClick={() => setViewProformaId(String(proforma.id))}>View</DropdownMenuItem>
                                {canEditProforma(proforma) && (
                                  <DropdownMenuItem onClick={() => void openEditProformaDialog(proforma)}>Edit</DropdownMenuItem>
                                )}
                                {proforma.status === "draft" && (
                                  <DropdownMenuItem onClick={() => openConvertDialog(proforma)}>Convert to invoice</DropdownMenuItem>
                                )}
                                {canDeleteProforma(proforma) && (
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void handleDeleteProforma(proforma.id)}>
                                    Delete
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => downloadDocumentPdf(proforma)}>PDF</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && filteredProformas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No proformas found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DataCard>
      ) : (
          <DataCard
            actions={
              <>
                <SearchBar value={query} onChange={setQuery} placeholder="Search invoice #, customer, plate..." />
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
                const customer = invoice.customer ?? customerById.get(String(invoice.customer_id));
                const car = invoice.car ?? carById.get(String(invoice.car_id));
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
                      <Badge className={paymentBadge(invoice.payment_status)}>{invoice.payment_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                        <Badge className={`hidden md:inline-flex ${paymentBadge(invoice.payment_status)}`}>{invoice.payment_status}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => setViewId(String(invoice.id))}>
                          <Eye className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadDocumentPdf(invoice)}>
                          <Download className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">PDF</span>
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
                            <DropdownMenuItem onClick={() => downloadDocumentPdf(invoice)}>PDF</DropdownMenuItem>
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
      )}

      <Dialog open={!!viewProformaId} onOpenChange={(value) => !value && setViewProformaId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Proforma {viewingProforma?.proforma_number}</DialogTitle></DialogHeader>
          {viewProformaLoading && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!viewProformaLoading && viewingProforma && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Bill To</p>
                  <p className="font-semibold">{viewProformaCustomer?.name}</p>
                  <p className="text-xs text-muted-foreground">{viewProformaCustomer?.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-semibold">{viewProformaCar?.plate_number}</p>
                  <p className="text-xs text-muted-foreground">Date: {formatDate(viewingProforma.date)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={viewingProforma.status === "converted" ? "secondary" : "outline"}>
                  {viewingProforma.status === "converted" ? "Converted" : "Draft"}
                </Badge>
                {viewingProforma.invoice && (
                  <span className="text-sm text-muted-foreground">
                    Invoice: <span className="font-mono font-semibold">{viewingProforma.invoice.invoice_number}</span>
                  </span>
                )}
              </div>
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
                  {viewingProforma.items.map((item, index) => (
                    <TableRow key={`${item.description}-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-lg font-bold">Total</TableCell>
                    <TableCell className="text-right text-lg font-bold text-primary">{formatCurrency(viewingProforma.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex flex-wrap justify-end gap-2">
                {canEditProforma(viewingProforma) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void openEditProformaDialog(viewingProforma);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit proforma
                  </Button>
                )}
                {viewingProforma.status === "draft" && (
                  <Button className="bg-gradient-primary" onClick={() => openConvertDialog(viewingProforma)}>
                    <FileCheck className="mr-2 h-4 w-4" /> Convert to invoice
                  </Button>
                )}
                {canDeleteProforma(viewingProforma) && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleDeleteProforma(viewingProforma.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                )}
                <Button variant="outline" onClick={() => openPrintableDocument(viewingProforma)}>Print</Button>
                <Button className="bg-gradient-primary" onClick={() => downloadDocumentPdf(viewingProforma)}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!convertTarget} onOpenChange={(open) => !open && setConvertTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convert to invoice</DialogTitle>
          </DialogHeader>
          {convertTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirm conversion after the customer has paid. Stock is deducted when payment status is paid.
              </p>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Proforma</span>
                  <span className="font-mono font-semibold">{convertTarget.proforma_number}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">
                    {convertTarget.customer?.name ??
                      customerById.get(String(convertTarget.customer_id))?.name ??
                      "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-primary">{formatCurrency(convertTarget.total)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{convertTarget.items.length} line item(s)</div>
              </div>
              <div className="space-y-2">
                <Label>Invoice date</Label>
                <Input type="date" value={convertDate} onChange={(e) => setConvertDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payment status</Label>
                <Select value={convertPaymentStatus} onValueChange={(v) => setConvertPaymentStatus(v as "unpaid" | "partial" | "paid")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid (deduct stock)</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConvertTarget(null)} disabled={converting}>
                  Cancel
                </Button>
                <Button type="button" className="bg-gradient-primary" disabled={converting} onClick={() => void handleConvertToInvoice()}>
                  {converting ? "Converting…" : "Confirm & create invoice"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {mode === "invoices" && (
      <Dialog open={!!viewId} onOpenChange={(value) => !value && setViewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {viewing?.invoice_number}</DialogTitle>
            <p className="text-sm text-muted-foreground">Final document — read only</p>
          </DialogHeader>
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

              {viewing.payments && viewing.payments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Payments recorded</p>
                  <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                    {viewing.payments.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-muted/30 px-3 py-2">
                        <span className="text-muted-foreground">{p.paid_at ? formatDate(String(p.paid_at)) : "—"}</span>
                        <span className="font-mono font-semibold">{formatCurrency(p.amount)}</span>
                        <span className="truncate text-muted-foreground">{p.note ?? "—"}</span>
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
                <Button variant="outline" onClick={() => openPrintableDocument(viewing)}>Print</Button>
                <Button className="bg-gradient-primary" onClick={() => downloadDocumentPdf(viewing)}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
