import { useEffect, useState } from "react";
import { Download, Eye, Loader2, Plus, Trash2, MoreHorizontal } from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
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
  listCarsRequest,
  listCustomersRequest,
  listInvoicesRequest,
  listServicesRequest,
  listStocksRequest,
  updateInvoicePaymentStatusRequest,
  type CarApi,
  type CustomerApi,
  type InvoiceApi,
  type ServiceApi,
  type StockApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

type ItemInput = { description: string; quantity: string; unit_price: string; item_type: "labor" | "custom" };
const GARAGE_NAME = "AZIZI AUTOMOTIVE GARAGE";
const GARAGE_PHONE = "+255677401259";
const GARAGE_EMAIL = "aziziautomotivegarage1@gmail.com";
const GARAGE_LOCATION = "Kijitonyama, Dar es Salaam, Tanzania";
const GARAGE_TIN = "127-702-112";
const PAYMENT_ACCOUNT = "A/C NO: 24710015587 - NMB";
const PAYMENT_ACCOUNT_NAME = "A/C NAME: AZIZI AUTOMOTIVE GARAGE";

let logoDataUrlPromise: Promise<string | null> | null = null;

const formatTzs = (value: number) => new Intl.NumberFormat("en-US").format(Math.max(0, Number(value) || 0));
const formatInvoiceDateLong = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const resolvePaidAmount = (status: InvoiceApi["payment_status"], total: number) => {
  if (status === "paid") return total;
  return 0;
};

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
  type StockItemInput = { stock_id: string; quantity: string };

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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [carId, setCarId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [items, setItems] = useState<ItemInput[]>([{ description: "", quantity: "", unit_price: "", item_type: "custom" }]);
  const [stockItems, setStockItems] = useState<StockItemInput[]>([]);

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

  const filtered = list;

  const viewing = viewId ? list.find((invoice) => String(invoice.id) === viewId) : null;
  const viewCustomer = viewing ? customers.find((c) => String(c.id) === String(viewing.customer_id)) : null;
  const viewCar = viewing ? cars.find((c) => String(c.id) === String(viewing.car_id)) : null;
  const viewService = viewing ? services.find((s) => String(s.id) === String(viewing.service_id)) : null;

  const updateItem = (idx: number, patch: Partial<ItemInput>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addStockRow = () => setStockItems((prev) => [...prev, { stock_id: "", quantity: "" }]);
  const updateStockRow = (index: number, key: "stock_id" | "quantity", value: string) =>
    setStockItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  const removeStockRow = (index: number) => setStockItems((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!customerId || !carId) {
      toast.error("Select customer and car");
      return;
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(list.length + 1).padStart(4, "0")}`;
    const validItems = items
      .filter((it) => it.description.trim())
      .map((it) => {
        const quantity = Number(it.quantity);
        const unitPrice = Number(it.unit_price);
        return {
          description: it.description.trim(),
          quantity,
          unit_price: unitPrice,
          item_type: it.item_type,
        };
      })
      .filter((it) => Number.isFinite(it.quantity) && it.quantity > 0 && Number.isFinite(it.unit_price) && it.unit_price >= 0);

    const validStockItems = stockItems
      .map((it) => ({
        stock_id: it.stock_id,
        quantity: Number(it.quantity),
      }))
      .filter((it) => it.stock_id && Number.isFinite(it.quantity) && it.quantity > 0);

    const stockById = new Map(stocks.map((stock) => [String(stock.id), stock]));
    const orderedInvoiceItems = [
      ...validStockItems.map((it) => {
        const stock = stockById.get(String(it.stock_id));
        return {
          item_type: "stock" as const,
          stock_id: it.stock_id,
          description: stock?.name ?? "",
          quantity: it.quantity,
        };
      }),
      ...validItems.map((it) => ({
        item_type: it.item_type,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
      })),
    ].map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    setSubmitting(true);
    try {
      const response = await createInvoiceRequest(token, {
        invoice_number: invoiceNumber,
        date: new Date().toISOString().slice(0, 10),
        customer_id: customerId,
        car_id: carId,
        ...(serviceId ? { service_id: serviceId } : {}),
        payment_status: paymentStatus,
        invoice_items: orderedInvoiceItems,
      });
      setList((prev) => [response.data, ...prev]);
      setOpen(false);
      setCustomerId("");
      setCarId("");
      setServiceId("");
      setPaymentStatus("unpaid");
      setItems([{ description: "", quantity: "", unit_price: "", item_type: "custom" }]);
      setStockItems([]);
      toast.success("Invoice created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentStatus = async (invoiceId: string | number, value: "unpaid" | "partial" | "paid") => {
    if (!token) return;
    try {
      const response = await updateInvoicePaymentStatusRequest(token, invoiceId, value);
      setList((prev) => prev.map((invoice) => (String(invoice.id) === String(invoiceId) ? { ...invoice, ...response.data } : invoice)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payment status.");
    }
  };

  const handleDelete = async (invoiceId: string | number) => {
    if (!token) return;
    try {
      await deleteInvoiceRequest(token, invoiceId);
      setList((prev) => prev.filter((invoice) => String(invoice.id) !== String(invoiceId)));
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
    const amountPaid = resolvePaidAmount(invoice.payment_status, Number(invoice.total) || 0);
    const balanceDue = Math.max(0, (Number(invoice.total) || 0) - amountPaid);
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
    const amountPaid = resolvePaidAmount(invoice.payment_status, Number(invoice.total) || 0);
    const balanceDue = Math.max(0, (Number(invoice.total) || 0) - amountPaid);
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
        description="Generate and manage invoices. Service totals are calculated from invoice items."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md">
                <Plus className="mr-2 h-5 w-5" /> New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
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
                  <div className="flex items-center justify-between">
                    <Label>Stock Items (optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addStockRow}>
                      <Plus className="mr-1 h-4 w-4" /> Add Stock
                    </Button>
                  </div>
                  {stockItems.map((it, idx) => (
                    <div key={`invoice-stock-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,120px,40px]">
                      <Select
                        value={it.stock_id}
                        onValueChange={(value) => updateStockRow(idx, "stock_id", value)}
                        open={stockSelectOpen}
                        onOpenChange={setStockSelectOpen}
                      >
                        <SelectTrigger><SelectValue placeholder="Select stock item" /></SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              value={stockSearch}
                              onChange={(e) => setStockSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="Search stock items"
                            />
                          </div>
                          {stockOptions.map((stock) => (
                            <SelectItem key={stock.id} value={String(stock.id)}>{stock.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => updateStockRow(idx, "quantity", e.target.value)}
                        placeholder="Qty"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeStockRow(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {stocks.length === 0 && <p className="text-xs text-muted-foreground">No stock items available yet.</p>}
                </div>

                <div className="space-y-2">
                  <Label>Custom/Labor Items (optional)</Label>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
                        <Input
                          className="sm:col-span-6"
                          placeholder="Description"
                          value={it.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                        />
                        <Input
                          className="sm:col-span-2"
                          type="number"
                          min={1}
                          placeholder="Qty"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        />
                        <Input
                          className="sm:col-span-2"
                          type="number"
                          min={0}
                          placeholder="Unit Price"
                          value={it.unit_price}
                          onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                        />
                        <Select value={it.item_type} onValueChange={(v) => updateItem(idx, { item_type: v as "labor" | "custom" })}>
                          <SelectTrigger className="sm:col-span-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Custom</SelectItem>
                            <SelectItem value="labor">Labor</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" className="sm:col-span-1" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { description: "", quantity: "", unit_price: "", item_type: "custom" }])}>
                    <Plus className="mr-1 h-4 w-4" /> Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as "unpaid" | "partial" | "paid")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                    {submitting ? "Saving..." : "Save Invoice"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
                <TableHead className="hidden sm:table-cell">Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading invoices...</span>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((invoice) => {
                const customer = customers.find((c) => String(c.id) === String(invoice.customer_id));
                const car = cars.find((c) => String(c.id) === String(invoice.car_id));
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-semibold">{invoice.invoice_number}</TableCell>
                    <TableCell>{formatDate(invoice.date)}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer?.name}</TableCell>
                    <TableCell>
                      <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{car?.plate_number}</span>
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(invoice.total)}</TableCell>
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
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
          {viewing && (
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
                <Button variant="outline" onClick={() => openPrintableInvoice(viewing)}>Print</Button>
                <Button className="bg-gradient-primary" onClick={() => downloadInvoicePdf(viewing)}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
