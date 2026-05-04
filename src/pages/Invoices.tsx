import { useEffect, useState } from "react";
import { Download, Eye, Loader2, Plus, Trash2 } from "lucide-react";
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
import { jsPDF } from "jspdf";
import {
  createInvoiceRequest,
  deleteInvoiceRequest,
  listCarsRequest,
  listCustomersRequest,
  listInvoicesRequest,
  listServicesRequest,
  updateInvoicePaymentStatusRequest,
  type CarApi,
  type CustomerApi,
  type InvoiceApi,
  type ServiceApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

type ItemInput = { description: string; quantity: number; unit_price: number; item_type: "labor" | "custom" };

export default function Invoices() {
  const { token } = useAuth();
  const [list, setList] = useState<InvoiceApi[]>([]);
  const [customers, setCustomers] = useState<CustomerApi[]>([]);
  const [cars, setCars] = useState<CarApi[]>([]);
  const [services, setServices] = useState<ServiceApi[]>([]);
  const [query, setQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [carSearch, setCarSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false);
  const [carSelectOpen, setCarSelectOpen] = useState(false);
  const [serviceSelectOpen, setServiceSelectOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerApi[]>([]);
  const [carOptions, setCarOptions] = useState<CarApi[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceApi[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [carId, setCarId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [items, setItems] = useState<ItemInput[]>([{ description: "", quantity: 1, unit_price: 0, item_type: "custom" }]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [invoicesRes, customersRes, carsRes, servicesRes] = await Promise.all([
          listInvoicesRequest(token, { search: query }),
          listCustomersRequest(token),
          listCarsRequest(token),
          listServicesRequest(token),
        ]);
        setList(invoicesRes.data);
        setCustomers(customersRes.data);
        setCars(carsRes.data);
        setServices(servicesRes.data);
        setCustomerOptions(customersRes.data);
        setCarOptions(carsRes.data);
        setServiceOptions(servicesRes.data);
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

  const filtered = list;

  const viewing = viewId ? list.find((invoice) => String(invoice.id) === viewId) : null;
  const viewCustomer = viewing ? customers.find((c) => String(c.id) === String(viewing.customer_id)) : null;
  const viewCar = viewing ? cars.find((c) => String(c.id) === String(viewing.car_id)) : null;
  const viewService = viewing ? services.find((s) => String(s.id) === String(viewing.service_id)) : null;

  const updateItem = (idx: number, patch: Partial<ItemInput>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

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
      .map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        item_type: it.item_type,
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
        items: validItems,
      });
      setList((prev) => [response.data, ...prev]);
      setOpen(false);
      setCustomerId("");
      setCarId("");
      setServiceId("");
      setPaymentStatus("unpaid");
      setItems([{ description: "", quantity: 1, unit_price: 0, item_type: "custom" }]);
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
    const service = services.find((s) => String(s.id) === String(invoice.service_id));
    const rows = invoice.items
      .map(
        (item) => `
          <tr>
            <td>${item.description}</td>
            <td style="text-align:right;">${item.quantity}</td>
            <td style="text-align:right;">${formatCurrency(item.unit_price)}</td>
            <td style="text-align:right;">${formatCurrency(item.line_total)}</td>
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
            body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
            h1 { margin: 0 0 8px 0; }
            .muted { color: #666; font-size: 12px; }
            .section { margin-top: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
            th { background: #f3f4f6; text-align: left; }
            .totals { margin-top: 12px; text-align: right; font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>Invoice ${invoice.invoice_number}</h1>
          <p class="muted">Date: ${formatDate(invoice.date)} | Payment: ${invoice.payment_status.toUpperCase()}</p>
          <div class="grid section">
            <div>
              <strong>Customer</strong>
              <div>${customer?.name ?? "—"}</div>
              <div class="muted">${customer?.phone ?? "—"}</div>
              <div class="muted">${customer?.email ?? "—"}</div>
              <div class="muted">${customer?.address ?? "—"}</div>
            </div>
            <div>
              <strong>Car</strong>
              <div>${car?.plate_number ?? "—"}</div>
              <div class="muted">${car?.vehicle_type ?? "—"} | ${car?.model_year ?? "—"} | ${car?.color ?? "—"}</div>
              <strong style="display:block; margin-top:8px;">Service</strong>
              <div>${service ? `${formatDate(service.date)} - ${service.problem}` : "No linked service"}</div>
              <div class="muted">${service?.fix ?? ""}</div>
            </div>
          </div>
          <div class="section">
            <strong>Items</strong>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align:right;">Qty</th>
                  <th style="text-align:right;">Unit Price</th>
                  <th style="text-align:right;">Line Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div class="totals">Total: ${formatCurrency(invoice.total)}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadInvoicePdf = (invoice: InvoiceApi) => {
    const customer = customers.find((c) => String(c.id) === String(invoice.customer_id));
    const car = cars.find((c) => String(c.id) === String(invoice.car_id));
    const service = services.find((s) => String(s.id) === String(invoice.service_id));

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = 14;
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Easy Garage Invoice", 14, 17);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #${invoice.invoice_number}`, 14, 23);
    doc.text(`Date: ${formatDate(invoice.date)}`, 145, 23);

    y = 36;
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(14, y, 88, 36, 2, 2);
    doc.roundedRect(108, y, 88, 36, 2, 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Customer", 18, y + 7);
    doc.text("Vehicle / Service", 112, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(customer?.name ?? "—", 18, y + 13);
    doc.text(customer?.phone ?? "—", 18, y + 19);
    doc.text(customer?.email ?? "—", 18, y + 25);
    doc.text(car?.plate_number ?? "—", 112, y + 13);
    doc.text(`${car?.vehicle_type ?? "—"} | ${car?.model_year ?? "—"} | ${car?.color ?? "—"}`, 112, y + 19);
    doc.text(service ? `${formatDate(service.date)} - ${service.problem}` : "No linked service", 112, y + 25);
    y += 44;

    doc.setFont("helvetica", "bold");
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y, 182, 8, "F");
    doc.text("Description", 16, y + 5.5);
    doc.text("Qty", 122, y + 5.5, { align: "right" });
    doc.text("Unit Price", 156, y + 5.5, { align: "right" });
    doc.text("Line Total", 192, y + 5.5, { align: "right" });
    y += 10;
    doc.setFont("helvetica", "normal");

    for (const item of invoice.items) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const descLines = doc.splitTextToSize(item.description, 96);
      const rowHeight = Math.max(6, descLines.length * 5);
      doc.text(descLines, 16, y + 4);
      doc.text(String(item.quantity), 122, y + 4, { align: "right" });
      doc.text(formatCurrency(item.unit_price), 156, y + 4, { align: "right" });
      doc.text(formatCurrency(item.line_total), 192, y + 4, { align: "right" });
      y += rowHeight;
      doc.setDrawColor(235, 235, 235);
      doc.line(14, y, 196, y);
      y += 2;
    }

    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Payment: ${invoice.payment_status.toUpperCase()}`, 14, y);
    doc.text(`Total: ${formatCurrency(invoice.total)}`, 192, y, { align: "right" });
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Thank you for choosing Easy Garage.", 14, y);

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
                <div className="grid grid-cols-3 gap-3">
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
                  <Label>Custom/Labor Items (optional)</Label>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          className="col-span-6"
                          placeholder="Description"
                          value={it.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                        />
                        <Input
                          className="col-span-2"
                          type="number"
                          min={1}
                          placeholder="Qty"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 1 })}
                        />
                        <Input
                          className="col-span-2"
                          type="number"
                          min={0}
                          placeholder="Unit Price"
                          value={it.unit_price}
                          onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) || 0 })}
                        />
                        <Select value={it.item_type} onValueChange={(v) => updateItem(idx, { item_type: v as "labor" | "custom" })}>
                          <SelectTrigger className="col-span-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Custom</SelectItem>
                            <SelectItem value="labor">Labor</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, item_type: "custom" }])}>
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
                <TableHead>Customer</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
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
                    <TableCell>{customer?.name}</TableCell>
                    <TableCell>
                      <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{car?.plate_number}</span>
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
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
                      <div className="flex justify-end gap-1">
                        <Badge className={paymentBadge(invoice.payment_status)}>{invoice.payment_status}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => setViewId(String(invoice.id))}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadInvoicePdf(invoice)}>
                          <Download className="mr-1 h-4 w-4" /> PDF
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void handleDelete(invoice.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-4 text-sm">
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
              <div className="flex justify-end gap-2">
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
