import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Car as CarIcon, FileText, Phone, Mail, MapPin, Printer, Calendar } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { customers, cars, invoices, services, formatCurrency } from "@/lib/mock-data";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customer = customers.find((c) => c.id === id);

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

  const ownedCars = cars.filter((c) => c.customerId === customer.id);
  const carIds = ownedCars.map((c) => c.id);
  const custInvoices = invoices.filter((i) => i.customerId === customer.id);
  const custServices = services.filter((s) => carIds.includes(s.carId));
  const totalPaid = custInvoices.filter((i) => i.paid).reduce((s, i) => s + i.total, 0);
  const totalOutstanding = custInvoices.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0);

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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Car</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custInvoices.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>
              )}
              {custInvoices.map((i) => {
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DataCard>

      <DataCard title="Service History">
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
              {custServices.map((s) => {
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
      </DataCard>
    </div>
  );
}
