import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Wrench, FileText, User, Phone, Mail, MapPin, Printer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cars, customers, services, invoices, formatCurrency } from "@/lib/mock-data";

export default function CarDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const car = cars.find((c) => c.id === id);

  if (!car) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Car not found.</p>
      </div>
    );
  }

  const owner = customers.find((c) => c.id === car.customerId);
  const carServices = services.filter((s) => s.carId === car.id);
  const carInvoices = invoices.filter((i) => i.carId === car.id);
  const totalSpent = carInvoices.filter((i) => i.paid).reduce((s, i) => s + i.total, 0);
  const totalUnpaid = carInvoices.filter((i) => !i.paid).reduce((s, i) => s + i.total, 0);

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
              {carServices.map((s) => {
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
      </DataCard>

      <DataCard title="Invoices" actions={<FileText className="h-4 w-4 text-muted-foreground" />}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carInvoices.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>
              )}
              {carInvoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono font-semibold">{i.number}</TableCell>
                  <TableCell>{i.date}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(i.total)}</TableCell>
                  <TableCell>
                    <Badge className={i.paid ? "bg-success text-success-foreground hover:bg-success" : "bg-warning text-warning-foreground hover:bg-warning"}>
                      {i.paid ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataCard>
    </div>
  );
}
