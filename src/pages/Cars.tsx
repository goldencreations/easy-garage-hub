import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
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
import { cars as initialCars, customers, type Car } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Cars() {
  const navigate = useNavigate();
  const [list, setList] = useState<Car[]>(initialCars);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");

  const filtered = list.filter((c) => {
    const q = query.toLowerCase();
    return c.plate.toLowerCase().includes(q) || c.make.toLowerCase().includes(q) || c.model.toLowerCase().includes(q);
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId) {
      toast.error("Please select the customer who owns this car");
      return;
    }
    const f = new FormData(e.currentTarget);
    const newCar: Car = {
      id: `v${Date.now()}`,
      plate: String(f.get("plate")),
      make: String(f.get("make")),
      model: String(f.get("model")),
      year: Number(f.get("year")),
      color: String(f.get("color")),
      customerId,
    };
    setList([newCar, ...list]);
    setAddOpen(false);
    setCustomerId("");
    toast.success("Car added");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cars"
        description="Search any plate number to instantly see full service history."
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md">
                <Plus className="mr-2 h-5 w-5" /> Add Car
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Car</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleAdd}>
                <div className="space-y-2">
                  <Label>Customer (Owner) *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Select customer who owns this car" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">A customer can own more than one car.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Plate Number *</Label><Input name="plate" required placeholder="T 123 ABC" /></div>
                  <div className="space-y-2"><Label>Year</Label><Input name="year" type="number" placeholder="2020" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Make</Label><Input name="make" placeholder="Toyota" /></div>
                  <div className="space-y-2"><Label>Model</Label><Input name="model" placeholder="Corolla" /></div>
                </div>
                <div className="space-y-2"><Label>Color</Label><Input name="color" placeholder="White" /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary">Save Car</Button>
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
              {filtered.map((c) => {
                const owner = customers.find((x) => x.id === c.customerId);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/cars/${c.id}`)}>
                    <TableCell>
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono font-bold text-primary">{c.plate}</span>
                    </TableCell>
                    <TableCell className="font-medium">{c.make} {c.model}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.year}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.color}</TableCell>
                    <TableCell>{owner?.name ?? "—"}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/cars/${c.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => toast("Edit form")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setList(list.filter(x => x.id !== c.id)); toast.success("Car removed"); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
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
