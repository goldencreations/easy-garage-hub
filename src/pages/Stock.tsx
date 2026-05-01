import { useState } from "react";
import { Plus, Pencil, AlertTriangle, Package, PackageX, Layers } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stock as initialStock, formatCurrency, type StockItem } from "@/lib/mock-data";
import { toast } from "sonner";

const CATEGORIES = ["Lubricants", "Brakes", "Electrical", "Filters", "Engine", "Body", "Tyres", "Other"];

export default function Stock() {
  const [list, setList] = useState<StockItem[]>(initialStock);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [category, setCategory] = useState("");

  const filtered = list.filter((s) => {
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });
  const lowCount = list.filter((s) => s.quantity <= s.lowStockThreshold).length;
  const totalValue = list.reduce((sum, s) => sum + s.price * s.quantity, 0);

  const openAdd = () => { setEditing(null); setCategory(""); setOpen(true); };
  const openEdit = (item: StockItem) => { setEditing(item); setCategory(item.category); setOpen(true); };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!category) { toast.error("Select category"); return; }
    const f = new FormData(e.currentTarget);
    const data = {
      name: String(f.get("name")),
      category,
      price: Number(f.get("price")),
      quantity: Number(f.get("quantity")),
      lowStockThreshold: Number(f.get("threshold")),
    };
    if (editing) {
      setList(list.map((s) => s.id === editing.id ? { ...editing, ...data } : s));
      toast.success("Stock updated");
    } else {
      setList([{ id: `p${Date.now()}`, ...data }, ...list]);
      toast.success("Stock item added");
    }
    setOpen(false); setEditing(null); setCategory("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Manage parts inventory. Stock decreases automatically after each repair."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={openAdd}>
                <Plus className="mr-2 h-5 w-5" /> Add Stock Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Update Stock Item" : "Add Stock Item"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="space-y-2"><Label>Item Name *</Label><Input name="name" required defaultValue={editing?.name} placeholder="e.g. Engine Oil 5W-30" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Price (TSH) *</Label><Input name="price" required type="number" defaultValue={editing?.price} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Quantity *</Label><Input name="quantity" required type="number" defaultValue={editing?.quantity} /></div>
                  <div className="space-y-2"><Label>Low Stock Alert At</Label><Input name="threshold" type="number" defaultValue={editing?.lowStockThreshold ?? 5} /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary">{editing ? "Update" : "Save Item"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Items" value={list.length} icon={Package} tone="primary" />
        <StatCard label="Stock Value" value={formatCurrency(totalValue)} icon={Layers} tone="success" />
        <StatCard label="Low Stock" value={lowCount} icon={PackageX} tone="warning" />
      </div>

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search items…" />
            <ExportActions entity="stock" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const low = s.quantity <= s.lowStockThreshold;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold">{s.name}</TableCell>
                    <TableCell><Badge variant="secondary">{s.category}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(s.price)}</TableCell>
                    <TableCell className="text-right font-bold">{s.quantity}</TableCell>
                    <TableCell>
                      {low ? (
                        <Badge className="bg-warning text-warning-foreground hover:bg-warning">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Low
                        </Badge>
                      ) : (
                        <Badge className="bg-success text-success-foreground hover:bg-success">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="mr-1 h-4 w-4" /> Update
                      </Button>
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
