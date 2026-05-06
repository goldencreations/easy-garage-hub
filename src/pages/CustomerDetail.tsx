import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Car as CarIcon, Download, Eye, FileText, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { buildInvoicePdf, downloadInvoicePdf } from "@/lib/invoice-pdf";
import { formatCurrency, type Car as MockCar, type Customer as MockCustomer, type Invoice as MockInvoice } from "@/lib/mock-data";
import { formatDate } from "@/lib/date";
import { customerDetailsRequest, type CarApi, type InvoiceApi } from "@/lib/api";
import { toast } from "sonner";

const toNumber = (value: number | string | null | undefined) => Number(value) || 0;

function toMockInvoice(invoice: InvoiceApi): MockInvoice {
  return {
    id: String(invoice.id),
    number: invoice.invoice_number,
    customerId: String(invoice.customer_id),
    carId: String(invoice.car_id),
    date: invoice.date,
    items: (invoice.items ?? []).map((item) => ({
      description: item.description,
      qty: toNumber(item.quantity),
      price: toNumber(item.unit_price),
    })),
    labour: 0,
    total: toNumber(invoice.total),
    paid: invoice.payment_status === "paid",
    staff: "System User",
  };
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof customerDetailsRequest>>["data"] | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token || !id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await customerDetailsRequest(token, id);
        setPayload(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load customer details.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token, id]);

  const customer = payload?.customer;
  const cars = customer?.cars ?? [];
  const services = customer?.services ?? [];
  const invoices = customer?.invoices ?? [];

  const previewUrl = useMemo(() => (previewBlob ? URL.createObjectURL(previewBlob) : null), [previewBlob]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const totals = useMemo(() => {
    const paid = invoices.filter((i) => i.payment_status === "paid").reduce((sum, i) => sum + toNumber(i.total), 0);
    const unpaid = invoices.filter((i) => i.payment_status !== "paid").reduce((sum, i) => sum + toNumber(i.total), 0);
    return { paid, unpaid };
  }, [invoices]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return services.filter((service) => {
      if (serviceDate) {
        const d = String(service.date).slice(0, 10);
        if (d !== serviceDate) return false;
      }
      if (!q) return true;
      const carText = (service.car as CarApi | undefined)?.plate_number ?? "";
      const blob = [service.problem, service.fix ?? "", service.status, carText].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [services, serviceSearch, serviceDate]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceNumber.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (invoiceDate) {
        const d = String(invoice.date).slice(0, 10);
        if (d !== invoiceDate) return false;
      }
      if (!q) return true;
      return invoice.invoice_number.toLowerCase().includes(q);
    });
  }, [invoices, invoiceDate, invoiceNumber]);

  const carById = useMemo(() => new Map(cars.map((car) => [String(car.id), car])), [cars]);

  const createPdfBlob = useCallback(
    async (invoice: InvoiceApi, regeneratedAt?: Date) => {
      if (!customer) return new Blob([], { type: "application/pdf" });
      const car = ((invoice as InvoiceApi & { car?: CarApi }).car ?? carById.get(String(invoice.car_id))) as CarApi | undefined;
      const mockCar: MockCar | undefined = car
        ? {
            id: String(car.id),
            plate: car.plate_number,
            make: car.vehicle_type,
            model: "",
            year: Number(car.model_year) || new Date().getFullYear(),
            color: car.color,
            customerId: String(car.customer_id),
          }
        : undefined;
      const mockCustomer: MockCustomer = {
        id: String(customer.id),
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? "—",
        address: customer.address ?? "Dar es Salaam",
        carIds: cars.map((item) => String(item.id)),
        createdAt: "",
      };
      return buildInvoicePdf(toMockInvoice(invoice), mockCustomer, mockCar, regeneratedAt ? { regeneratedAt } : undefined);
    },
    [carById, cars, customer],
  );

  const previewInvoice = previewInvoiceId ? invoices.find((i) => String(i.id) === previewInvoiceId) ?? null : null;

  const handlePreviewPdf = useCallback(
    async (invoice: InvoiceApi) => {
      setPreviewInvoiceId(String(invoice.id));
      const blob = await createPdfBlob(invoice);
      setPreviewBlob(blob);
    },
    [createPdfBlob],
  );

  const handleExportPdf = useCallback(
    async (invoice: InvoiceApi, blob?: Blob) => {
      const resolved = blob ?? (await createPdfBlob(invoice));
      downloadInvoicePdf(resolved, invoice.invoice_number);
      toast.success("PDF downloaded");
    },
    [createPdfBlob],
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading customer details...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!customer) return <p className="text-sm text-muted-foreground">No customer details found.</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
      </Button>

      <PageHeader title={customer.name} description={`${customer.phone} • ${customer.address ?? "—"}`} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Paid" value={formatCurrency(totals.paid)} icon={FileText} tone="success" />
        <StatCard label="Outstanding" value={formatCurrency(totals.unpaid)} icon={FileText} tone="warning" />
        <StatCard label="Cars Owned" value={payload?.history?.cars_count ?? cars.length} icon={CarIcon} tone="primary" />
        <StatCard label="Total Visits" value={payload?.history?.services_count ?? services.length} icon={Calendar} tone="accent" />
      </div>

      <DataCard title="Contact Information">
        <div className="grid grid-cols-1 gap-3 p-5 text-sm md:grid-cols-3">
          <p><span className="text-muted-foreground">Phone:</span> {customer.phone}</p>
          <p><span className="text-muted-foreground">Email:</span> {customer.email ?? "—"}</p>
          <p><span className="text-muted-foreground">Address:</span> {customer.address ?? "—"}</p>
        </div>
      </DataCard>

      <DataCard title="Cars Owned">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cars.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No cars yet.</TableCell></TableRow>}
              {cars.map((car) => (
                <TableRow key={car.id}>
                  <TableCell className="font-mono">{car.plate_number}</TableCell>
                  <TableCell>{car.vehicle_type}</TableCell>
                  <TableCell>{car.model_year}</TableCell>
                  <TableCell>{car.color}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/cars/${car.id}`}><Button size="sm" variant="ghost">View History</Button></Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataCard>

      <DataCard title="Invoice History">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Search by invoice number..."
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No invoices match your filters.</TableCell></TableRow>}
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>{((invoice as InvoiceApi & { car?: CarApi }).car?.plate_number ?? carById.get(String(invoice.car_id))?.plate_number ?? "—")}</TableCell>
                  <TableCell>{formatCurrency(invoice.total)}</TableCell>
                  <TableCell><Badge variant="outline">{invoice.payment_status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => void handlePreviewPdf(invoice)}>
                        <Eye className="mr-1 h-4 w-4" /> Preview PDF
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void handleExportPdf(invoice)}>
                        <Download className="mr-1 h-4 w-4" /> PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {previewInvoice && previewUrl && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex flex-wrap justify-between gap-2">
              <p className="font-semibold">PDF preview — {previewInvoice.invoice_number}</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={async () => {
                  const blob = await createPdfBlob(previewInvoice, new Date());
                  setPreviewBlob(blob);
                  toast.success("Invoice PDF regenerated");
                }}>
                  <RefreshCw className="mr-1 h-4 w-4" /> Regenerate PDF
                </Button>
                <Button type="button" size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => void handleExportPdf(previewInvoice, previewBlob ?? undefined)}>
                  <Download className="mr-1 h-4 w-4" /> Export PDF
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setPreviewInvoiceId(null); setPreviewBlob(null); }}>
                  <X className="mr-1 h-4 w-4" /> Close
                </Button>
              </div>
            </div>
            <iframe title={`Invoice ${previewInvoice.invoice_number}`} src={previewUrl} className="h-[min(85vh,720px)] w-full rounded-md border bg-background" />
          </div>
        )}
      </DataCard>

      <DataCard title="Service History">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Search service problem, fix, car..."
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
          />
          <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Fix</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No services match your filters.</TableCell></TableRow>}
              {filteredServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{formatDate(service.date)}</TableCell>
                  <TableCell>{(service.car as CarApi | undefined)?.plate_number ?? carById.get(String(service.car_id))?.plate_number ?? "—"}</TableCell>
                  <TableCell>{service.problem}</TableCell>
                  <TableCell>{service.fix ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{service.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataCard>
    </div>
  );
}
