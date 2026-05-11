import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  createCarRequest,
  deleteCarRequest,
  listCarsRequest,
  listCustomersRequest,
  updateCarRequest,
  type CarApi,
  type CustomerApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Cars() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [list, setList] = useState<CarApi[]>([]);
  const [customers, setCustomers] = useState<CustomerApi[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CarApi | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerApi[]>([]);
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
        const [carsResponse, customersResponse] = await Promise.all([
          listCarsRequest(token, { search: query }),
          listCustomersRequest(token),
        ]);
        setList(carsResponse.data);
        setCustomers(customersResponse.data);
        setCustomerOptions(customersResponse.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load cars.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token, query]);

  useEffect(() => {
    const loadCustomerOptions = async () => {
      if (!token || !customerSelectOpen) return;
      try {
        const response = await listCustomersRequest(token, { search: customerSearch });
        setCustomerOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search customers.");
      }
    };

    void loadCustomerOptions();
  }, [token, customerSelectOpen, customerSearch]);

  const openAdd = () => {
    setEditing(null);
    setCustomerId("");
    setOpen(true);
  };

  const openEdit = (car: CarApi) => {
    setEditing(car);
    setCustomerId(String(car.customer_id));
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    if (!customerId) {
      toast.error("Please select the customer who owns this car");
      return;
    }
    const f = new FormData(e.currentTarget);
    const modelYear = String(f.get("model_year") ?? "").trim();
    const color = String(f.get("color") ?? "").trim();
    const payload = {
      customer_id: customerId,
      plate_number: String(f.get("plate_number")),
      vehicle_type: String(f.get("vehicle_type")),
      ...(modelYear ? { model_year: modelYear } : {}),
      ...(color ? { color } : {}),
    };

    setSubmitting(true);
    try {
      if (editing) {
        const response = await updateCarRequest(token, editing.id, payload);
        setList((prev) => prev.map((car) => (String(car.id) === String(editing.id) ? response.data : car)));
        toast.success("Car updated");
      } else {
        const response = await createCarRequest(token, payload);
        setList((prev) => [response.data, ...prev]);
        toast.success("Car added");
      }
      setOpen(false);
      setEditing(null);
      setCustomerId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save car.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (carId: string | number) => {
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    try {
      await deleteCarRequest(token, carId);
      setList((prev) => prev.filter((car) => String(car.id) !== String(carId)));
      toast.success("Car removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove car.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cars"
        description="Search any plate number to instantly see full service history."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={openAdd}>
                <Plus className="mr-2 h-5 w-5" /> Add Car
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Car" : "Add New Car"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="space-y-2">
                  <Label>Customer (Owner) *</Label>
                  <Select
                    value={customerId}
                    onValueChange={setCustomerId}
                    open={customerSelectOpen}
                    onOpenChange={setCustomerSelectOpen}
                  >
                    <SelectTrigger><SelectValue placeholder="Select customer who owns this car" /></SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder="Search customer by name/phone"
                        />
                      </div>
                      {customerOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">A customer can own more than one car.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Plate Number *</Label><Input name="plate_number" required defaultValue={editing?.plate_number} placeholder="T 123 ABC" /></div>
                  <div className="space-y-2"><Label>Year</Label><Input name="model_year" placeholder="2020" defaultValue={editing?.model_year} /></div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Vehicle Type *</Label><Input name="vehicle_type" required placeholder="Toyota Corolla" defaultValue={editing?.vehicle_type} /></div>
                  <div className="space-y-2"><Label>Color</Label><Input name="color" placeholder="White" defaultValue={editing?.color} /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={submitting} onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                    {submitting ? "Saving..." : editing ? "Update Car" : "Save Car"}
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
            <SearchBar value={query} onChange={setQuery} placeholder="Search by plate, make, model…" />
            <ExportActions entity="cars" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="hidden md:table-cell">Year</TableHead>
                <TableHead className="hidden md:table-cell">Color</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading cars...</span>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((c) => {
                const owner = customers.find((x) => String(x.id) === String(c.customer_id));
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/cars/${c.id}`)}>
                    <TableCell>
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono font-bold text-primary">{c.plate_number}</span>
                    </TableCell>
                    <TableCell className="font-medium">{c.vehicle_type}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.model_year}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.color}</TableCell>
                    <TableCell>{owner?.name ?? "—"}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="hidden justify-end gap-1 sm:flex">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/cars/${c.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex justify-end sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Open actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/cars/${c.id}`)}>View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void handleDelete(c.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No cars found. {customers.length === 0 && <Badge variant="secondary">Add a customer first</Badge>}
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
