import { useState, useMemo } from "react";
import { Plus, Eye, Download, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { invoices as initialInvoices, customers, cars, formatCurrency, type Invoice } from "@/lib/mock-data";
import { toast } from "sonner";

type Item = { description: string; qty: number; price: number };

export default function Invoices() {
  const [list, setList] = useState<Invoice[]>(initialInvoices);
  const [query, setQuery] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [carId, setCarId] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", qty: 1, price: 0 }]);
  const [labour, setLabour] = useState(0);
  const [paid, setPaid] = useState(false);

  const customerCars = cars.filter((c) => c.customerId === customerId);
  const total = useMemo(() => items.reduce((s, it) => s + it.qty * it.price, 0) + Number(labour || 0), [items, labour]);

  const filtered = list.filter((i) => {
    const cust = customers.find((c) => c.id === i.customerId);
    const car = cars.find((c) => c.id === i.carId);
    const q = query.toLowerCase();
    return (
      i.number.toLowerCase().includes(q) ||
      cust?.name.toLowerCase().includes(q) ||
      car?.plate.toLowerCase().includes(q)
    );
  });

  const viewing = viewId ? list.find((i) => i.id === viewId) : null;
  const vCust = viewing ? customers.find((c) => c.id === viewing.customerId) : null;
  const vCar = viewing ? cars.find((c) => c.id === viewing.carId) : null;

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !carId) { toast.error("Select customer and car"); return; }
    const newInv: Invoice = {
      id: `i${Date.now()}`,
      number: `INV-${new Date().getFullYear()}-${String(list.length + 1).padStart(4, "0")}`,
      customerId, carId,
      date: new Date().toISOString().slice(0, 10),
      items: items.filter((it) => it.description.trim()),
      labour: Number(labour),
      total,
      paid,
      staff: "Admin",
    };
    setList([newInv, ...list]);
    setOpen(false);
    setCustomerId(""); setCarId(""); setItems([{ description: "", qty: 1, price: 0 }]); setLabour(0); setPaid(false);
    toast.success("Invoice created");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Generate, view, regenerate, and export invoices."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md">
                <Plus className="mr-2 h-5 w-5" /> New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setCarId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Car *</Label>
                    <Select value={carId} onValueChange={setCarId} disabled={!customerId}>
                      <SelectTrigger><SelectValue placeholder={customerId ? "Select car" : "Select customer first"} /></SelectTrigger>
                      <SelectContent>
                        {customerCars.map((c) => <SelectItem key={c.id} value={c.id}>{c.plate} — {c.make} {c.model}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Items</Label>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2">
                        <Input className="col-span-6" placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                        <Input className="col-span-2" type="number" min={1} placeholder="Qty" value={it.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} />
                        <Input className="col-span-3" type="number" placeholder="Price" value={it.price} onChange={(e) => updateItem(idx, { price: Number(e.target.value) })} />
                        <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { description: "", qty: 1, price: 0 }])}>
                    <Plus className="mr-1 h-4 w-4" /> Add Item
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Labour Charge (TSH)</Label><Input type="number" value={labour} onChange={(e) => setLabour(Number(e.target.value))} /></div>
                  <div className="flex items-end gap-3 pb-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={paid} onCheckedChange={setPaid} />
                      <Label>Mark as Paid</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary">Save Invoice</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
                    <TableCell><span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{car?.plate}</span></TableCell>
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
          <DialogHeader><DialogTitle>Invoice {viewing?.number}</DialogTitle></DialogHeader>
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
                <Button variant="outline" onClick={() => window.print()}>Print</Button>
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
