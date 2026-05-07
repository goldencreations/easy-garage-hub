import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, MoreHorizontal } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  createServiceRequest,
  deleteServiceRequest,
  listCarsRequest,
  listCustomersRequest,
  listServicesRequest,
  listStaffRequest,
  listStocksRequest,
  listInvoicesRequest,
  updateServiceRequest,
  updateServiceStatusRequest,
  type CarApi,
  type CustomerApi,
  type ServiceApi,
  type ServiceStatus,
  type StaffApi,
  type StockApi,
  type InvoiceApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

export default function Services() {
  type StockItemInput = { stock_id: string; quantity: number };

  const { token } = useAuth();
  const [list, setList] = useState<ServiceApi[]>([]);
  const [cars, setCars] = useState<CarApi[]>([]);
  const [customers, setCustomers] = useState<CustomerApi[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffApi[]>([]);
  const [stocks, setStocks] = useState<StockApi[]>([]);
  const [invoices, setInvoices] = useState<InvoiceApi[]>([]);
  const [query, setQuery] = useState("");
  const [carSearch, setCarSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [editCarSearch, setEditCarSearch] = useState("");
  const [editStaffSearch, setEditStaffSearch] = useState("");
  const [editStockSearch, setEditStockSearch] = useState("");
  const [carSelectOpen, setCarSelectOpen] = useState(false);
  const [staffSelectOpen, setStaffSelectOpen] = useState(false);
  const [stockSelectOpen, setStockSelectOpen] = useState(false);
  const [editCarSelectOpen, setEditCarSelectOpen] = useState(false);
  const [editStaffSelectOpen, setEditStaffSelectOpen] = useState(false);
  const [editStockSelectOpen, setEditStockSelectOpen] = useState(false);
  const [createCarOptions, setCreateCarOptions] = useState<CarApi[]>([]);
  const [createStaffOptions, setCreateStaffOptions] = useState<StaffApi[]>([]);
  const [createStockOptions, setCreateStockOptions] = useState<StockApi[]>([]);
  const [editCarOptions, setEditCarOptions] = useState<CarApi[]>([]);
  const [editStaffOptions, setEditStaffOptions] = useState<StaffApi[]>([]);
  const [editStockOptions, setEditStockOptions] = useState<StockApi[]>([]);
  const [open, setOpen] = useState(false);
  const [carId, setCarId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [status, setStatus] = useState<ServiceStatus>("pending");
  const [stockItems, setStockItems] = useState<StockItemInput[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceApi | null>(null);
  const [editCarId, setEditCarId] = useState<string>("");
  const [editStaffId, setEditStaffId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<ServiceStatus>("pending");
  const [editStockItems, setEditStockItems] = useState<StockItemInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const customerByCar = useMemo(() => {
    return new Map(cars.map((car) => [String(car.id), String(car.customer_id)]));
  }, [cars]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [servicesRes, carsRes, customersRes, staffRes, stocksRes, invoicesRes] = await Promise.all([
          listServicesRequest(token, { search: query }),
          listCarsRequest(token),
          listCustomersRequest(token),
          listStaffRequest(token),
          listStocksRequest(token),
          listInvoicesRequest(token),
        ]);
        setList(servicesRes.data);
        setCars(carsRes.data);
        setCustomers(customersRes.data);
        setStaffMembers(staffRes.data);
        setStocks(stocksRes.data);
        setInvoices(invoicesRes.data);
        setCreateCarOptions(carsRes.data);
        setCreateStaffOptions(staffRes.data);
        setCreateStockOptions(stocksRes.data);
        setEditCarOptions(carsRes.data);
        setEditStaffOptions(staffRes.data);
        setEditStockOptions(stocksRes.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load services.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token, query]);

  useEffect(() => {
    const loadCreateCars = async () => {
      if (!token || !carSelectOpen) return;
      try {
        const response = await listCarsRequest(token, { search: carSearch });
        setCreateCarOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search cars.");
      }
    };
    void loadCreateCars();
  }, [token, carSelectOpen, carSearch]);

  useEffect(() => {
    const loadCreateStaff = async () => {
      if (!token || !staffSelectOpen) return;
      try {
        const response = await listStaffRequest(token, { search: staffSearch });
        setCreateStaffOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search staff.");
      }
    };
    void loadCreateStaff();
  }, [token, staffSelectOpen, staffSearch]);

  useEffect(() => {
    const loadCreateStocks = async () => {
      if (!token || !stockSelectOpen) return;
      try {
        const response = await listStocksRequest(token, { search: stockSearch });
        setCreateStockOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search stock.");
      }
    };
    void loadCreateStocks();
  }, [token, stockSelectOpen, stockSearch]);

  useEffect(() => {
    const loadEditCars = async () => {
      if (!token || !editCarSelectOpen) return;
      try {
        const response = await listCarsRequest(token, { search: editCarSearch });
        setEditCarOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search cars.");
      }
    };
    void loadEditCars();
  }, [token, editCarSelectOpen, editCarSearch]);

  useEffect(() => {
    const loadEditStaff = async () => {
      if (!token || !editStaffSelectOpen) return;
      try {
        const response = await listStaffRequest(token, { search: editStaffSearch });
        setEditStaffOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search staff.");
      }
    };
    void loadEditStaff();
  }, [token, editStaffSelectOpen, editStaffSearch]);

  useEffect(() => {
    const loadEditStocks = async () => {
      if (!token || !editStockSelectOpen) return;
      try {
        const response = await listStocksRequest(token, { search: editStockSearch });
        setEditStockOptions(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not search stock.");
      }
    };
    void loadEditStocks();
  }, [token, editStockSelectOpen, editStockSearch]);

  const filtered = list;
  const filteredCarsForCreate = createCarOptions.filter((c) => {
    const owner = customers.find((x) => String(x.id) === String(c.customer_id));
    const q = carSearch.toLowerCase();
    return !q || c.plate_number.toLowerCase().includes(q) || (owner?.name ?? "").toLowerCase().includes(q);
  });
  const filteredStaffForCreate = createStaffOptions.filter((member) => !staffSearch || member.name.toLowerCase().includes(staffSearch.toLowerCase()));
  const filteredStocksForCreate = createStockOptions.filter((stock) => !stockSearch || stock.name.toLowerCase().includes(stockSearch.toLowerCase()));
  const filteredCarsForEdit = editCarOptions.filter((c) => {
    const owner = customers.find((x) => String(x.id) === String(c.customer_id));
    const q = editCarSearch.toLowerCase();
    return !q || c.plate_number.toLowerCase().includes(q) || (owner?.name ?? "").toLowerCase().includes(q);
  });
  const filteredStaffForEdit = editStaffOptions.filter((member) => !editStaffSearch || member.name.toLowerCase().includes(editStaffSearch.toLowerCase()));
  const filteredStocksForEdit = editStockOptions.filter((stock) => !editStockSearch || stock.name.toLowerCase().includes(editStockSearch.toLowerCase()));

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    if (!carId || !staffId) {
      toast.error("Select car and staff");
      return;
    }

    const customerId = customerByCar.get(carId);
    if (!customerId) {
      toast.error("Selected car has no customer.");
      return;
    }

    const f = new FormData(e.currentTarget);
    const validStockItems = stockItems
      .filter((item) => item.stock_id && item.quantity > 0)
      .map((item) => ({ stock_id: item.stock_id, quantity: item.quantity }));

    const payload = {
      date: String(f.get("date")) || new Date().toISOString().slice(0, 10),
      customer_id: customerId,
      car_id: carId,
      leading_staff_id: staffId,
      problem: String(f.get("problem")),
      fix: String(f.get("fix") ?? ""),
      status,
      stock_items: validStockItems,
    };

    setSubmitting(true);
    try {
      const response = await createServiceRequest(token, payload);
      setList((prev) => [response.data, ...prev]);
      setOpen(false);
      setCarId("");
      setStaffId("");
      setStatus("pending");
      setStockItems([]);
      setInvoices((prev) => prev);
      toast.success("Service record added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create service.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (service: ServiceApi) => {
    setEditingService(service);
    setEditCarId(String(service.car_id));
    setEditStaffId(String(service.leading_staff_id));
    setEditStatus(service.status);
    setEditStockItems(
      (service.stocks ?? []).map((stock) => ({
        stock_id: String(stock.id),
        quantity: Number(stock.pivot?.quantity ?? 1),
      })),
    );
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !editingService) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }
    if (!editCarId || !editStaffId) {
      toast.error("Select car and staff.");
      return;
    }

    const customerId = customerByCar.get(editCarId);
    if (!customerId) {
      toast.error("Selected car has no customer.");
      return;
    }

    const f = new FormData(e.currentTarget);
    const validStockItems = editStockItems
      .filter((item) => item.stock_id && item.quantity > 0)
      .map((item) => ({ stock_id: item.stock_id, quantity: item.quantity }));

    setSubmitting(true);
    try {
      const response = await updateServiceRequest(token, editingService.id, {
        date: String(f.get("date")) || new Date().toISOString().slice(0, 10),
        customer_id: customerId,
        car_id: editCarId,
        leading_staff_id: editStaffId,
        problem: String(f.get("problem")),
        fix: String(f.get("fix") ?? ""),
        status: editStatus,
        stock_items: validStockItems,
      });

      setList((prev) => prev.map((item) => (String(item.id) === String(editingService.id) ? response.data : item)));
      setEditOpen(false);
      setEditingService(null);
      setEditStockItems([]);
      toast.success("Service updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update service.");
    } finally {
      setSubmitting(false);
    }
  };

  const addStockRow = (forEdit = false) => {
    if (forEdit) {
      setEditStockItems((prev) => [...prev, { stock_id: "", quantity: 1 }]);
      return;
    }
    setStockItems((prev) => [...prev, { stock_id: "", quantity: 1 }]);
  };

  const updateStockRow = (index: number, key: "stock_id" | "quantity", value: string, forEdit = false) => {
    const updater = (prev: StockItemInput[]) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: key === "quantity" ? Number(value) || 0 : value } : item));

    if (forEdit) {
      setEditStockItems(updater);
      return;
    }
    setStockItems(updater);
  };

  const removeStockRow = (index: number, forEdit = false) => {
    if (forEdit) {
      setEditStockItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setStockItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async (serviceId: string | number) => {
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    try {
      await deleteServiceRequest(token, serviceId);
      setList((prev) => prev.filter((service) => String(service.id) !== String(serviceId)));
      toast.success("Service removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove service.");
    }
  };

  const handleStatusChange = async (serviceId: string | number, nextStatus: ServiceStatus) => {
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    try {
      const response = await updateServiceStatusRequest(token, serviceId, nextStatus);
      setList((prev) => prev.map((s) => (String(s.id) === String(serviceId) ? { ...s, ...response.data } : s)));
      toast.success("Service status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update status.");
    }
  };

  const statusLabel = (value: ServiceStatus) => {
    if (value === "complete") return "Completed";
    if (value === "onprogress") return "In Progress";
    return "Pending";
  };

  const invoiceTotalByServiceId = useMemo(
    () =>
      new Map(
        invoices
          .filter((invoice) => invoice.service_id !== null && invoice.service_id !== undefined)
          .map((invoice) => [String(invoice.service_id), Number(invoice.total)]),
      ),
    [invoices],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service & Repair History"
        description="Every problem, fix, part, and staff member — for every car."
        actions={
          <>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md">
                  <Plus className="mr-2 h-5 w-5" /> New Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>New Service Record</DialogTitle></DialogHeader>
                <form className="space-y-4" onSubmit={handleAdd}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Car *</Label>
                      <Select value={carId} onValueChange={setCarId} open={carSelectOpen} onOpenChange={setCarSelectOpen}>
                        <SelectTrigger><SelectValue placeholder="Select car" /></SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              value={carSearch}
                              onChange={(e) => setCarSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="Search car by plate/owner"
                            />
                          </div>
                          {filteredCarsForCreate.map((c) => {
                            const owner = customers.find((x) => String(x.id) === String(c.customer_id));
                            return <SelectItem key={c.id} value={String(c.id)}>{c.plate_number} — {owner?.name}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Problem Reported *</Label><Input name="problem" required placeholder="e.g. Engine overheating" /></div>
                  <div className="space-y-2"><Label>Fix Performed</Label><Textarea name="fix" placeholder="Describe what was done" /></div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Staff *</Label>
                      <Select value={staffId} onValueChange={setStaffId} open={staffSelectOpen} onOpenChange={setStaffSelectOpen}>
                        <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              value={staffSearch}
                              onChange={(e) => setStaffSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="Search staff by name"
                            />
                          </div>
                          {filteredStaffForCreate.map((member) => (
                            <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as ServiceStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="onprogress">In Progress</SelectItem>
                          <SelectItem value="complete">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Stock Used (optional)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => addStockRow(false)}>Add Stock</Button>
                    </div>
                    {stockItems.map((item, index) => (
                      <div key={`create-stock-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,120px,40px]">
                        <Select
                          value={item.stock_id}
                          onValueChange={(value) => updateStockRow(index, "stock_id", value, false)}
                          open={stockSelectOpen}
                          onOpenChange={setStockSelectOpen}
                        >
                          <SelectTrigger><SelectValue placeholder="Select stock item" /></SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                value={stockSearch}
                                onChange={(e) => setStockSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Search stock items"
                              />
                            </div>
                            {filteredStocksForCreate.map((stock) => (
                              <SelectItem key={stock.id} value={String(stock.id)}>{stock.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity || ""}
                          onChange={(e) => updateStockRow(index, "quantity", e.target.value, false)}
                          placeholder="Qty"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeStockRow(index, false)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {stocks.length === 0 && <p className="text-xs text-muted-foreground">No stock items available yet.</p>}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                      {submitting ? "Saving..." : "Save Service"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Update Service Record</DialogTitle></DialogHeader>
          {editingService && (
            <form className="space-y-4" onSubmit={handleUpdate}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Car *</Label>
                  <Select value={editCarId} onValueChange={setEditCarId} open={editCarSelectOpen} onOpenChange={setEditCarSelectOpen}>
                    <SelectTrigger><SelectValue placeholder="Select car" /></SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          value={editCarSearch}
                          onChange={(e) => setEditCarSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder="Search car by plate/owner"
                        />
                      </div>
                      {filteredCarsForEdit.map((c) => {
                        const owner = customers.find((x) => String(x.id) === String(c.customer_id));
                        return <SelectItem key={c.id} value={String(c.id)}>{c.plate_number} — {owner?.name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={editingService.date} /></div>
              </div>
              <div className="space-y-2"><Label>Problem Reported *</Label><Input name="problem" required defaultValue={editingService.problem} /></div>
              <div className="space-y-2"><Label>Fix Performed</Label><Textarea name="fix" defaultValue={editingService.fix ?? ""} /></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Staff *</Label>
                  <Select value={editStaffId} onValueChange={setEditStaffId} open={editStaffSelectOpen} onOpenChange={setEditStaffSelectOpen}>
                    <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          value={editStaffSearch}
                          onChange={(e) => setEditStaffSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder="Search staff by name"
                        />
                      </div>
                      {filteredStaffForEdit.map((member) => (
                        <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ServiceStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="onprogress">In Progress</SelectItem>
                      <SelectItem value="complete">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Stock Used (optional)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => addStockRow(true)}>Add Stock</Button>
                </div>
                {editStockItems.map((item, index) => (
                  <div key={`edit-stock-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,120px,40px]">
                    <Select
                      value={item.stock_id}
                      onValueChange={(value) => updateStockRow(index, "stock_id", value, true)}
                      open={editStockSelectOpen}
                      onOpenChange={setEditStockSelectOpen}
                    >
                      <SelectTrigger><SelectValue placeholder="Select stock item" /></SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            value={editStockSearch}
                            onChange={(e) => setEditStockSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Search stock items"
                          />
                        </div>
                        {filteredStocksForEdit.map((stock) => (
                          <SelectItem key={stock.id} value={String(stock.id)}>{stock.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity || ""}
                      onChange={(e) => updateStockRow(index, "quantity", e.target.value, true)}
                      placeholder="Qty"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeStockRow(index, true)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {stocks.length === 0 && <p className="text-xs text-muted-foreground">No stock items available yet.</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>Cancel</Button>
                <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                  {submitting ? "Updating..." : "Update Service"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search by plate, problem, staff…" />
            <ExportActions entity="services" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Car</TableHead>
                <TableHead className="hidden sm:table-cell">Customer</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead className="hidden md:table-cell">Fix</TableHead>
                <TableHead className="hidden md:table-cell">Total</TableHead>
                <TableHead className="hidden md:table-cell">Staff</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading services...</span>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s) => {
                const car = cars.find((c) => String(c.id) === String(s.car_id));
                const cust = customers.find((c) => String(c.id) === String(s.customer_id));
                const invoiceTotal = invoiceTotalByServiceId.get(String(s.id));
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(s.date)}</TableCell>
                    <TableCell>
                      <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{car?.plate_number}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{cust?.name}</TableCell>
                    <TableCell className="font-medium">{s.problem}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{s.fix}</TableCell>
                    <TableCell className="hidden md:table-cell font-semibold">{formatCurrency(invoiceTotal ?? 0)}</TableCell>
                    <TableCell className="hidden md:table-cell">{s.leading_staff?.name ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Select value={s.status} onValueChange={(value) => void handleStatusChange(s.id, value as ServiceStatus)}>
                        <SelectTrigger className="h-8 min-w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="onprogress">In Progress</SelectItem>
                          <SelectItem value="complete">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={`hidden sm:inline-flex ${
                        s.status === "complete" ? "bg-success text-success-foreground hover:bg-success" :
                        s.status === "onprogress" ? "bg-warning text-warning-foreground hover:bg-warning" :
                        "bg-muted text-muted-foreground hover:bg-muted"
                      }`}>{statusLabel(s.status)}</Badge>
                      <div className="hidden items-center justify-end gap-1 sm:flex">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void handleDelete(s.id)}>
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
                            <DropdownMenuItem onClick={() => void handleStatusChange(s.id, "pending")}>
                              Mark Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleStatusChange(s.id, "onprogress")}>
                              Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleStatusChange(s.id, "complete")}>
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(s)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void handleDelete(s.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No services found.
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
