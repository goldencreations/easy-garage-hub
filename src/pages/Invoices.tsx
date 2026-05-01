import { useState } from "react";
import { Plus, Eye, Download } from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { invoices, customers, cars, formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Invoices() {
  const [query, setQuery] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  const filtered = invoices.filter((i) => {
    const cust = customers.find((c) => c.id === i.customerId);
    const car = cars.find((c) => c.id === i.carId);
    const q = query.toLowerCase();
    return (
      i.number.toLowerCase().includes(q) ||
      cust?.name.toLowerCase().includes(q) ||
      car?.plate.toLowerCase().includes(q)
    );
  });

  const viewing = viewId ? invoices.find((i) => i.id === viewId) : null;
  const vCust = viewing ? customers.find((c) => c.id === viewing.customerId) : null;
  const vCar = viewing ? cars.find((c) => c.id === viewing.carId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Generate, view, regenerate, and export invoices."
        actions={
          <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={() => toast("Invoice form")}>
            <Plus className="mr-2 h-5 w-5" /> New Invoice
          </Button>
        }
      />

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search by invoice #, customer, plate…" />
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const cust = customers.find((c) => c.id === i.customerId);
                const car = cars.find((c) => c.id === i.carId);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono font-semibold">{i.number}</TableCell>
                    <TableCell>{i.date}</TableCell>
                    <TableCell>{cust?.name}</TableCell>
                    <TableCell>
                      <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{car?.plate}</span>
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(i.total)}</TableCell>
                    <TableCell>
                      <Badge className={i.paid ? "bg-success text-success-foreground hover:bg-success" : "bg-warning text-warning-foreground hover:bg-warning"}>
                        {i.paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewId(i.id)}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toast.success("PDF downloaded")}>
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
      </DataCard>

      <Dialog open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {viewing?.number}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bill To</p>
                  <p className="font-semibold">{vCust?.name}</p>
                  <p className="text-xs text-muted-foreground">{vCust?.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-semibold">{vCar?.plate} — {vCar?.make} {vCar?.model}</p>
                  <p className="text-xs text-muted-foreground">Date: {viewing.date}</p>
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
                  {viewing.items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{it.description}</TableCell>
                      <TableCell className="text-right">{it.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.qty * it.price)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold">Labour</TableCell>
                    <TableCell className="text-right">{formatCurrency(viewing.labour)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-lg font-bold">Total</TableCell>
                    <TableCell className="text-right text-lg font-bold text-primary">{formatCurrency(viewing.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">Generated by {viewing.staff}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => toast.success("Printed")}>Print</Button>
                <Button className="bg-gradient-primary" onClick={() => toast.success("PDF exported")}>
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
