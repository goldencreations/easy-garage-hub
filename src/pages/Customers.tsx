import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createCustomerRequest,
  deleteCustomerRequest,
  listCarsRequest,
  listCustomersRequest,
  updateCustomerRequest,
  type CarApi,
  type CustomerApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Customers() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [list, setList] = useState<CustomerApi[]>([]);
  const [cars, setCars] = useState<CarApi[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const filtered = list;

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [customersResponse, carsResponse] = await Promise.all([
          listCustomersRequest(token, { search: query }),
          listCarsRequest(token),
        ]);
        setList(customersResponse.data);
        setCars(carsResponse.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load customers.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token, query]);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (customer: CustomerApi) => {
    setEditing(customer);
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name")),
      phone: String(f.get("phone")),
      email: String(f.get("email") ?? "").trim(),
      address: String(f.get("address") ?? "").trim(),
    };

    setSubmitting(true);
    try {
      if (editing) {
        const response = await updateCustomerRequest(token, editing.id, payload);
        setList((prev) => prev.map((item) => (String(item.id) === String(editing.id) ? response.data : item)));
        toast.success("Customer updated");
      } else {
        const response = await createCustomerRequest(token, payload);
        setList((prev) => [response.data, ...prev]);
        toast.success("Customer added");
      }
      setOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customerId: string | number) => {
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    try {
      await deleteCustomerRequest(token, customerId);
      setList((prev) => prev.filter((c) => String(c.id) !== String(customerId)));
      setCars((prev) => prev.filter((c) => String(c.customer_id) !== String(customerId)));
      toast.success("Customer removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove customer.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Add, search, and manage your garage customers."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={openAdd}>
                <Plus className="mr-2 h-5 w-5" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Customer" : "Add New Customer"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input name="name" required defaultValue={editing?.name} placeholder="e.g. John Mwangi" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input name="phone" required defaultValue={editing?.phone} placeholder="+254 7…" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input name="email" type="email" defaultValue={editing?.email ?? ""} placeholder="name@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea name="address" defaultValue={editing?.address ?? ""} placeholder="City / Town" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                    {submitting ? "Saving..." : editing ? "Update Customer" : "Save Customer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search by name, phone, email…" />
            <ExportActions entity="customers" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Address</TableHead>
                <TableHead>Cars</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading customers...</span>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((c) => {
                const owned = cars.filter((v) => String(v.customer_id) === String(c.id));
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/customers/${c.id}`)}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.email ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.address ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.cars_count ?? owned.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/customers/${c.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No customers match your search.
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
