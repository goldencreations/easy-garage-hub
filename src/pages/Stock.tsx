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
import { stock, formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Stock() {
  const [query, setQuery] = useState("");
  const filtered = stock.filter((s) => {
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });
  const lowCount = stock.filter((s) => s.quantity <= s.lowStockThreshold).length;
  const totalValue = stock.reduce((sum, s) => sum + s.price * s.quantity, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Manage parts inventory. Stock decreases automatically after each repair."
        actions={
          <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={() => toast("Stock form")}>
            <Plus className="mr-2 h-5 w-5" /> Add Stock Item
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Items" value={stock.length} icon={Package} tone="primary" />
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
                      <Button size="sm" variant="ghost" onClick={() => toast("Update stock")}>
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
