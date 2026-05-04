import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, AlertTriangle, Package, PackageX, Layers, Trash2, Loader2 } from "lucide-react";
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
import {
  createStockCategoryRequest,
  createStockRequest,
  deleteStockCategoryRequest,
  deleteStockRequest,
  listStockCategoriesRequest,
  listStocksRequest,
  updateStockCategoryRequest,
  updateStockRequest,
  type StockApi,
  type StockCategoryApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Stock() {
  const { token } = useAuth();
  const [list, setList] = useState<StockApi[]>([]);
  const [categories, setCategories] = useState<StockCategoryApi[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockApi | null>(null);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<StockCategoryApi | null>(null);

  const filtered = list.filter((s) => {
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.category?.name ?? "").toLowerCase().includes(q);
  });

  const lowCount = list.filter((s) => s.status !== "available").length;
  const totalValue = list.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const categoryNameById = useMemo(() => new Map(categories.map((cat) => [String(cat.id), cat.name])), [categories]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [stocksRes, categoriesRes] = await Promise.all([
          listStocksRequest(token),
          listStockCategoriesRequest(token),
        ]);
        setList(stocksRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load stock data.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token]);

  const openAdd = () => { setEditing(null); setCategory(""); setOpen(true); };
  const openEdit = (item: StockApi) => { setEditing(item); setCategory(String(item.stock_category_id)); setOpen(true); };

  const computeStatus = (quantity: number): "available" | "low" | "out_of_stock" => {
    if (quantity <= 0) return "out_of_stock";
    if (quantity <= 5) return "low";
    return "available";
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }
    if (!category) {
      toast.error("Select category");
      return;
    }

    const f = new FormData(e.currentTarget);
    const quantity = Number(f.get("quantity"));
    const data = {
      name: String(f.get("name")),
      price: Number(f.get("price")),
      quantity,
      stock_category_id: category,
      status: computeStatus(quantity),
    };

    setSubmitting(true);
    try {
      if (editing) {
        const response = await updateStockRequest(token, editing.id, data);
        setList((prev) => prev.map((s) => (String(s.id) === String(editing.id) ? response.data : s)));
        toast.success("Stock updated");
      } else {
        const response = await createStockRequest(token, data);
        setList((prev) => [response.data, ...prev]);
        toast.success("Stock item added");
      }
      setOpen(false);
      setEditing(null);
      setCategory("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save stock item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStock = async (stockId: string | number) => {
    if (!token) return;
    try {
      await deleteStockRequest(token, stockId);
      setList((prev) => prev.filter((item) => String(item.id) !== String(stockId)));
      toast.success("Stock item deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete stock item.");
    }
  };

  const openCategoryAdd = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoriesOpen(true);
  };

  const openCategoryEdit = (item: StockCategoryApi) => {
    setEditingCategory(item);
    setCategoryName(item.name);
    setCategoriesOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!token) return;
    if (!categoryName.trim()) {
      toast.error("Category name is required.");
      return;
    }

    try {
      if (editingCategory) {
        const response = await updateStockCategoryRequest(token, editingCategory.id, { name: categoryName.trim() });
        setCategories((prev) => prev.map((cat) => (String(cat.id) === String(editingCategory.id) ? response.data : cat)));
        toast.success("Category updated");
      } else {
        const response = await createStockCategoryRequest(token, { name: categoryName.trim() });
        setCategories((prev) => [response.data, ...prev]);
        toast.success("Category added");
      }
      setCategoriesOpen(false);
      setEditingCategory(null);
      setCategoryName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category.");
    }
  };

  const handleDeleteCategory = async (categoryId: string | number) => {
    if (!token) return;
    try {
      await deleteStockCategoryRequest(token, categoryId);
      setCategories((prev) => prev.filter((cat) => String(cat.id) !== String(categoryId)));
      toast.success("Category deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category.");
    }
  };

  const statusClass = (status: StockApi["status"]) => {
    if (status === "out_of_stock") return "bg-destructive text-destructive-foreground hover:bg-destructive";
    if (status === "low") return "bg-warning text-warning-foreground hover:bg-warning";
    return "bg-success text-success-foreground hover:bg-success";
  };

  const statusLabel = (status: StockApi["status"]) => {
    if (status === "out_of_stock") return "Out of stock";
    if (status === "low") return "Low";
    return "In Stock";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Manage parts inventory. Stock decreases automatically after each repair."
        actions={
          <div className="flex gap-2">
            <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" onClick={openCategoryAdd}>Manage Categories</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingCategory ? "Update Category" : "Add Category"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. Lubricants" />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCategoriesOpen(false)}>Cancel</Button>
                    <Button type="button" className="bg-gradient-primary" onClick={() => void handleSaveCategory()}>
                      {editingCategory ? "Update Category" : "Save Category"}
                    </Button>
                  </DialogFooter>
                  <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                    {categories.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                        <span className="text-sm">{item.name}</span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openCategoryEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => void handleDeleteCategory(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
                        <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Price (TSH) *</Label><Input name="price" required type="number" min="0" defaultValue={editing?.price} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Quantity *</Label><Input name="quantity" required type="number" min="0" defaultValue={editing?.quantity} /></div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button type="submit" className="bg-gradient-primary" disabled={submitting}>{submitting ? "Saving..." : editing ? "Update" : "Save Item"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
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
            <SearchBar value={query} onChange={setQuery} placeholder="Search items..." />
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
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading stock...</span>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold">{s.name}</TableCell>
                  <TableCell><Badge variant="secondary">{s.category?.name ?? categoryNameById.get(String(s.stock_category_id)) ?? "—"}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(s.price)}</TableCell>
                  <TableCell className="text-right font-bold">{s.quantity}</TableCell>
                  <TableCell>
                    {s.status === "low" ? (
                      <Badge className={statusClass(s.status)}>
                        <AlertTriangle className="mr-1 h-3 w-3" /> Low
                      </Badge>
                    ) : (
                      <Badge className={statusClass(s.status)}>{statusLabel(s.status)}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="mr-1 h-4 w-4" /> Update
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void handleDeleteStock(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No stock items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DataCard>
    </div>
  );
}
