import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Wrench,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Printer,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cars, customers, services, invoices, formatCurrency, type Invoice, type Customer } from "@/lib/mock-data";
import { buildInvoicePdf, downloadInvoicePdf } from "@/lib/invoice-pdf";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function CarDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const car = cars.find((c) => c.id === id);

  const [invoiceNumberQuery, setInvoiceNumberQuery] = useState("");
  const [invoiceDateFilter, setInvoiceDateFilter] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [servicePage, setServicePage] = useState(1);
  const [serviceTextQuery, setServiceTextQuery] = useState("");
  const [serviceDateFilter, setServiceDateFilter] = useState("");

  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  useEffect(() => {
    setInvoiceNumberQuery("");
    setInvoiceDateFilter("");
    setInvoicePage(1);
    setServicePage(1);
    setServiceTextQuery("");
    setServiceDateFilter("");
    setPreviewInvoiceId(null);
    setPreviewBlob(null);
  }, [id]);

  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceNumberQuery, invoiceDateFilter]);

  useEffect(() => {
    setServicePage(1);
  }, [serviceTextQuery, serviceDateFilter]);

  const previewUrl = useMemo(() => {
    if (!previewBlob) return null;
    return URL.createObjectURL(previewBlob);
  }, [previewBlob]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const owner = useMemo(
    () => (car ? customers.find((c) => c.id === car.customerId) : undefined),
    [car],
  );

  const invoiceCustomer: Customer | null = useMemo(() => {
    if (!car) return null;
    return (
      owner ?? {
        id: car.customerId,
        name: "Unknown customer",
        phone: "—",
        email: "—",
        address: "—",
        carIds: [car.id],
        createdAt: "",
      }
    );
  }, [car, owner]);

  const carServices = useMemo(
    () => (car ? services.filter((s) => s.carId === car.id) : []),
    [car],
  );
  const carInvoices = useMemo(
    () => (car ? invoices.filter((i) => i.carId === car.id) : []),
    [car],
  );

  const totalSpent = useMemo(
    () => carInvoices.filter((i) => i.paid).reduce((s, i) => s + i.total, 0),
    [carInvoices],
  );
  const totalUnpaid = useMemo(
    () => carInvoices.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0),
    [carInvoices],
  );

  const invoicesSorted = useMemo(
    () => [...carInvoices].sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)),
    [carInvoices],
  );

  const invoicesFiltered = useMemo(() => {
    const q = invoiceNumberQuery.trim().toLowerCase();
    return invoicesSorted.filter((i) => {
      if (q && !i.number.toLowerCase().includes(q)) return false;
      if (invoiceDateFilter && i.date !== invoiceDateFilter) return false;
      return true;
    });
  }, [invoicesSorted, invoiceNumberQuery, invoiceDateFilter]);

  const invoiceTotalPages = Math.max(1, Math.ceil(invoicesFiltered.length / PAGE_SIZE));
  const safeInvoicePage = Math.min(invoicePage, invoiceTotalPages);

  const invoicesPageSlice = useMemo(() => {
    const start = (safeInvoicePage - 1) * PAGE_SIZE;
    return invoicesFiltered.slice(start, start + PAGE_SIZE);
  }, [invoicesFiltered, safeInvoicePage]);

  const invRangeStart = invoicesFiltered.length === 0 ? 0 : (safeInvoicePage - 1) * PAGE_SIZE + 1;
  const invRangeEnd = Math.min(safeInvoicePage * PAGE_SIZE, invoicesFiltered.length);

  const servicesSorted = useMemo(
    () => [...carServices].sort((a, b) => b.date.localeCompare(a.date)),
    [carServices],
  );

  const servicesFiltered = useMemo(() => {
    const q = serviceTextQuery.trim().toLowerCase();
    return servicesSorted.filter((s) => {
      if (serviceDateFilter && s.date !== serviceDateFilter) return false;
      if (!q) return true;
      const blob = [s.problem, s.fix, s.diagnosis, s.staff, s.status].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [servicesSorted, serviceTextQuery, serviceDateFilter]);

  const serviceTotalPages = Math.max(1, Math.ceil(servicesFiltered.length / PAGE_SIZE));
  const safeServicePage = Math.min(servicePage, serviceTotalPages);

  const servicesPageSlice = useMemo(() => {
    const start = (safeServicePage - 1) * PAGE_SIZE;
    return servicesFiltered.slice(start, start + PAGE_SIZE);
  }, [servicesFiltered, safeServicePage]);

  const svcRangeStart = servicesFiltered.length === 0 ? 0 : (safeServicePage - 1) * PAGE_SIZE + 1;
  const svcRangeEnd = Math.min(safeServicePage * PAGE_SIZE, servicesFiltered.length);

  const previewInvoice = previewInvoiceId
    ? carInvoices.find((i) => i.id === previewInvoiceId) ?? null
    : null;

  const createPdfBlob = useCallback(
    (inv: Invoice, regeneratedAt?: Date) => {
      if (!car || !invoiceCustomer) return new Blob([], { type: "application/pdf" });
      return buildInvoicePdf(inv, invoiceCustomer, car, regeneratedAt ? { regeneratedAt } : undefined);
    },
    [car, invoiceCustomer],
  );

  const handlePreviewPdf = useCallback(
    (inv: Invoice) => {
      setPreviewInvoiceId(inv.id);
      setPreviewBlob(createPdfBlob(inv));
    },
    [createPdfBlob],
  );

  const handleRegeneratePdf = useCallback(() => {
    if (!previewInvoice || !car || !invoiceCustomer) return;
    setPreviewBlob(createPdfBlob(previewInvoice, new Date()));
    toast.success("Invoice PDF regenerated");
  }, [previewInvoice, car, invoiceCustomer, createPdfBlob]);

  const handleExportPdf = useCallback(
    (inv: Invoice, blob?: Blob) => {
      const b = blob ?? createPdfBlob(inv);
      downloadInvoicePdf(b, inv.number);
      toast.success("PDF downloaded");
    },
    [createPdfBlob],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewInvoiceId(null);
    setPreviewBlob(null);
  }, []);

  if (!car) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cars
        </Button>

        <PageHeader
          title="Car Detail"
          description={`Car ID: ${id ?? "unknown"} — API data pending`}
        />

        <DataCard title="Vehicle Profile (API Required)">
          <div className="grid grid-cols-1 gap-3 p-5 text-sm md:grid-cols-2">
            <p><span className="text-muted-foreground">Plate Number:</span> <span className="font-semibold">[car.plate_number]</span></p>
            <p><span className="text-muted-foreground">Vehicle Type:</span> <span className="font-semibold">[car.vehicle_type]</span></p>
            <p><span className="text-muted-foreground">Model Year:</span> <span className="font-semibold">[car.model_year]</span></p>
            <p><span className="text-muted-foreground">Color:</span> <span className="font-semibold">[car.color]</span></p>
            <p><span className="text-muted-foreground">Customer ID:</span> <span className="font-semibold">[car.customer_id]</span></p>
          </div>
        </DataCard>

        <DataCard title="Owner (API Required)">
          <div className="grid grid-cols-1 gap-3 p-5 text-sm md:grid-cols-2">
            <p><span className="text-muted-foreground">Name:</span> <span className="font-semibold">[customer.name]</span></p>
            <p><span className="text-muted-foreground">Phone:</span> <span className="font-semibold">[customer.phone]</span></p>
            <p><span className="text-muted-foreground">Email:</span> <span className="font-semibold">[customer.email]</span></p>
            <p><span className="text-muted-foreground">Address:</span> <span className="font-semibold">[customer.address]</span></p>
          </div>
        </DataCard>

        <DataCard title="Service History (API Required)">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Fix</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Return all services for this car.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </DataCard>

        <DataCard title="Invoices (API Required)">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Return invoices with items for PDF/print generation.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </DataCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cars
      </Button>

      <PageHeader
        title={`${car.plate}`}
        description={`${car.make} ${car.model} • ${car.year} • ${car.color}`}
        actions={
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DataCard title="Vehicle Info">
          <div className="space-y-2 p-5 text-sm">
            <p><span className="text-muted-foreground">Plate:</span> <span className="font-mono font-bold text-primary">{car.plate}</span></p>
            <p><span className="text-muted-foreground">Make/Model:</span> <span className="font-semibold">{car.make} {car.model}</span></p>
            <p><span className="text-muted-foreground">Year:</span> <span className="font-semibold">{car.year}</span></p>
            <p><span className="text-muted-foreground">Color:</span> <span className="font-semibold">{car.color}</span></p>
          </div>
        </DataCard>

        <DataCard title="Owner">
          <div className="space-y-2 p-5 text-sm">
            {owner ? (
              <>
                <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> <Link to={`/customers/${owner.id}`} className="font-semibold text-primary hover:underline">{owner.name}</Link></p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {owner.phone}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {owner.email}</p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {owner.address}</p>
              </>
            ) : <p className="text-muted-foreground">No owner linked.</p>}
          </div>
        </DataCard>

        <DataCard title="Financial Summary">
          <div className="space-y-3 p-5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Paid</span><span className="font-bold text-success">{formatCurrency(totalSpent)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-bold text-warning">{formatCurrency(totalUnpaid)}</span></div>
            <div className="flex justify-between border-t pt-3"><span className="font-semibold">Total Invoices</span><span className="font-bold">{carInvoices.length}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Total Services</span><span className="font-bold">{carServices.length}</span></div>
          </div>
        </DataCard>
      </div>

      <DataCard title="Service History" actions={<Wrench className="h-4 w-4 text-muted-foreground" />}>
        <div className="space-y-4 p-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 sm:min-w-[220px]">
              <Label htmlFor="car-service-search">Search</Label>
              <Input
                id="car-service-search"
                placeholder="Problem, fix, staff…"
                value={serviceTextQuery}
                onChange={(e) => setServiceTextQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:min-w-[180px]">
              <Label htmlFor="car-service-date">Filter by date</Label>
              <Input
                id="car-service-date"
                type="date"
                value={serviceDateFilter}
                onChange={(e) => setServiceDateFilter(e.target.value)}
              />
            </div>
            {(serviceTextQuery || serviceDateFilter) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:mb-0.5"
                onClick={() => {
                  setServiceTextQuery("");
                  setServiceDateFilter("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Fix</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carServices.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No service records yet.</TableCell></TableRow>
                )}
                {carServices.length > 0 && servicesFiltered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No services match your search.</TableCell></TableRow>
                )}
                {servicesPageSlice.map((s) => {
                  const partsCost = s.partsUsed.reduce((sum, p) => sum + p.qty * p.price, 0);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.date}</TableCell>
                      <TableCell className="font-medium">{s.problem}</TableCell>
                      <TableCell className="text-muted-foreground">{s.fix}</TableCell>
                      <TableCell>{s.staff}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(partsCost + s.labourCharge)}</TableCell>
                      <TableCell>
                        <Badge className={
                          s.status === "Completed" ? "bg-success text-success-foreground hover:bg-success" :
                          s.status === "In Progress" ? "bg-warning text-warning-foreground hover:bg-warning" :
                          "bg-muted text-muted-foreground hover:bg-muted"
                        }>{s.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {carServices.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {svcRangeStart}-{svcRangeEnd} of {servicesFiltered.length} service{servicesFiltered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safeServicePage <= 1}
                  onClick={() => setServicePage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm tabular-nums">
                  Page {safeServicePage} of {serviceTotalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safeServicePage >= serviceTotalPages}
                  onClick={() => setServicePage((p) => Math.min(serviceTotalPages, p + 1))}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DataCard>

      <DataCard title="Invoices" actions={<FileText className="h-4 w-4 text-muted-foreground" />}>
        <div className="space-y-4 p-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 sm:min-w-[200px]">
              <Label htmlFor="car-invoice-search">Search by invoice number</Label>
              <Input
                id="car-invoice-search"
                placeholder="e.g. INV-2026-0001"
                value={invoiceNumberQuery}
                onChange={(e) => setInvoiceNumberQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:min-w-[180px]">
              <Label htmlFor="car-invoice-date">Filter by date</Label>
              <Input
                id="car-invoice-date"
                type="date"
                value={invoiceDateFilter}
                onChange={(e) => setInvoiceDateFilter(e.target.value)}
              />
            </div>
            {(invoiceNumberQuery || invoiceDateFilter) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:mb-0.5"
                onClick={() => {
                  setInvoiceNumberQuery("");
                  setInvoiceDateFilter("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carInvoices.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>
                )}
                {carInvoices.length > 0 && invoicesFiltered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No invoices match your search.</TableCell></TableRow>
                )}
                {invoicesPageSlice.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono font-semibold">{i.number}</TableCell>
                    <TableCell>{i.date}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(i.total)}</TableCell>
                    <TableCell>
                      <Badge className={i.paid ? "bg-success text-success-foreground hover:bg-success" : "bg-warning text-warning-foreground hover:bg-warning"}>
                        {i.paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handlePreviewPdf(i)}>
                          <Eye className="mr-1 h-4 w-4" /> Preview PDF
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleExportPdf(i)}>
                          <Download className="mr-1 h-4 w-4" /> PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {carInvoices.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {invRangeStart}-{invRangeEnd} of {invoicesFiltered.length} invoice{invoicesFiltered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safeInvoicePage <= 1}
                  onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm tabular-nums">
                  Page {safeInvoicePage} of {invoiceTotalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safeInvoicePage >= invoiceTotalPages}
                  onClick={() => setInvoicePage((p) => Math.min(invoiceTotalPages, p + 1))}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {previewInvoice && previewUrl && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold">PDF preview — {previewInvoice.number}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleRegeneratePdf}>
                    <RefreshCw className="mr-1 h-4 w-4" /> Regenerate PDF
                  </Button>
                  <Button type="button" size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => handleExportPdf(previewInvoice, previewBlob ?? undefined)}>
                    <Download className="mr-1 h-4 w-4" /> Export PDF
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={handleClosePreview}>
                    <X className="mr-1 h-4 w-4" /> Close
                  </Button>
                </div>
              </div>
              <iframe
                title={`Invoice ${previewInvoice.number}`}
                src={previewUrl}
                className="h-[min(85vh,720px)] w-full rounded-md border bg-background"
              />
            </div>
          )}
        </div>
      </DataCard>
    </div>
  );
}
