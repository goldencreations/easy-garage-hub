import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Car as CarIcon,
  FileText,
  Phone,
  Mail,
  MapPin,
  Printer,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { customers, cars, invoices, services, formatCurrency, type Invoice } from "@/lib/mock-data";
import { buildInvoicePdf, downloadInvoicePdf } from "@/lib/invoice-pdf";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customer = customers.find((c) => c.id === id);

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

  const ownedCars = useMemo(
    () => (customer ? cars.filter((c) => c.customerId === customer.id) : []),
    [customer],
  );
  const carIds = useMemo(() => ownedCars.map((c) => c.id), [ownedCars]);
  const custInvoices = useMemo(
    () => (customer ? invoices.filter((i) => i.customerId === customer.id) : []),
    [customer],
  );
  const custServices = useMemo(
    () => services.filter((s) => carIds.includes(s.carId)),
    [carIds],
  );
  const totalPaid = useMemo(
    () => custInvoices.filter((i) => i.paid).reduce((s, i) => s + i.total, 0),
    [custInvoices],
  );
  const totalOutstanding = useMemo(
    () => custInvoices.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0),
    [custInvoices],
  );

  const invoicesSorted = useMemo(
    () => [...custInvoices].sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)),
    [custInvoices],
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
    () => [...custServices].sort((a, b) => b.date.localeCompare(a.date)),
    [custServices],
  );

  const servicesFiltered = useMemo(() => {
    const q = serviceTextQuery.trim().toLowerCase();
    return servicesSorted.filter((s) => {
      if (serviceDateFilter && s.date !== serviceDateFilter) return false;
      if (!q) return true;
      const car = cars.find((c) => c.id === s.carId);
      const plate = car?.plate.toLowerCase() ?? "";
      const blob = [s.problem, s.fix, s.diagnosis, s.staff, plate, s.status].join(" ").toLowerCase();
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
    ? custInvoices.find((i) => i.id === previewInvoiceId) ?? null
    : null;

  const createPdfBlob = useCallback(
    (inv: Invoice, regeneratedAt?: Date) => {
      if (!customer) return new Blob([], { type: "application/pdf" });
      const car = cars.find((c) => c.id === inv.carId);
      return buildInvoicePdf(inv, customer, car, regeneratedAt ? { regeneratedAt } : undefined);
    },
    [customer],
  );

  const handlePreviewPdf = useCallback(
    (inv: Invoice) => {
      setPreviewInvoiceId(inv.id);
      setPreviewBlob(createPdfBlob(inv));
    },
    [createPdfBlob],
  );

  const handleRegeneratePdf = useCallback(() => {
    if (!previewInvoice || !customer) return;
    setPreviewBlob(createPdfBlob(previewInvoice, new Date()));
    toast.success("Invoice PDF regenerated");
  }, [previewInvoice, customer, createPdfBlob]);

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

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
      </Button>

      <PageHeader
        title={customer.name}
        description={`Customer since ${customer.createdAt}`}
        actions={
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Paid" value={formatCurrency(totalPaid)} icon={FileText} tone="success" />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={FileText} tone="warning" />
        <StatCard label="Cars Owned" value={ownedCars.length} icon={CarIcon} tone="primary" />
        <StatCard label="Total Visits" value={custServices.length} icon={Calendar} tone="accent" />
      </div>

      <DataCard title="Contact Information">
        <div className="grid grid-cols-1 gap-3 p-5 text-sm md:grid-cols-3">
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {customer.phone}</p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {customer.email}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {customer.address}</p>
        </div>
      </DataCard>

      <DataCard title="Cars Owned" actions={<CarIcon className="h-4 w-4 text-muted-foreground" />}>
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
              {ownedCars.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No cars yet.</TableCell></TableRow>
              )}
              {ownedCars.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{c.plate}</span></TableCell>
                  <TableCell className="font-medium">{c.make} {c.model}</TableCell>
                  <TableCell>{c.year}</TableCell>
                  <TableCell>{c.color}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/cars/${c.id}`}><Button size="sm" variant="ghost">View History</Button></Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataCard>

      <DataCard title="Invoice History" actions={<FileText className="h-4 w-4 text-muted-foreground" />}>
        <div className="space-y-4 p-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 sm:min-w-[200px]">
              <Label htmlFor="invoice-search">Search by invoice number</Label>
              <Input
                id="invoice-search"
                placeholder="e.g. INV-2026-0001"
                value={invoiceNumberQuery}
                onChange={(e) => setInvoiceNumberQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:min-w-[180px]">
              <Label htmlFor="invoice-date">Filter by date</Label>
              <Input
                id="invoice-date"
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
                  <TableHead>Car</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custInvoices.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>
                )}
                {custInvoices.length > 0 && invoicesFiltered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No invoices match your search.</TableCell></TableRow>
                )}
                {invoicesPageSlice.map((i) => {
                  const car = cars.find((c) => c.id === i.carId);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono font-semibold">{i.number}</TableCell>
                      <TableCell>{i.date}</TableCell>
                      <TableCell><span className="font-mono text-xs">{car?.plate}</span></TableCell>
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
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {custInvoices.length > 0 && (
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

      <DataCard title="Service History">
        <div className="space-y-4 p-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 sm:min-w-[220px]">
              <Label htmlFor="service-search">Search</Label>
              <Input
                id="service-search"
                placeholder="Problem, fix, plate, staff…"
                value={serviceTextQuery}
                onChange={(e) => setServiceTextQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:min-w-[180px]">
              <Label htmlFor="service-date">Filter by date</Label>
              <Input
                id="service-date"
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
                  <TableHead>Car</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Fix</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custServices.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No services yet.</TableCell></TableRow>
                )}
                {custServices.length > 0 && servicesFiltered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No services match your search.</TableCell></TableRow>
                )}
                {servicesPageSlice.map((s) => {
                  const car = cars.find((c) => c.id === s.carId);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.date}</TableCell>
                      <TableCell><span className="font-mono text-xs">{car?.plate}</span></TableCell>
                      <TableCell className="font-medium">{s.problem}</TableCell>
                      <TableCell className="text-muted-foreground">{s.fix}</TableCell>
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

          {custServices.length > 0 && (
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
    </div>
  );
}
