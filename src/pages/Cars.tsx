import { useState } from "react";
import { Plus, Eye, Pencil, Trash2, Wrench } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cars as initialCars, customers, services, formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Cars() {
  const [list, setList] = useState(initialCars);
  const [query, setQuery] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = list.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.plate.toLowerCase().includes(q) ||
      c.make.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q)
    );
  });

  const viewing = viewId ? list.find((c) => c.id === viewId) : null;
  const viewingHistory = viewing ? services.filter((s) => s.carId === viewing.id) : [];
  const viewingOwner = viewing ? customers.find((c) => c.id === viewing.customerId) : null;

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
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Car added");
                  setAddOpen(false);
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Plate Number</Label><Input required placeholder="KDA 123A" /></div>
                  <div className="space-y-2"><Label>Year</Label><Input type="number" placeholder="2020" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Make</Label><Input placeholder="Toyota" /></div>
                  <div className="space-y-2"><Label>Model</Label><Input placeholder="Corolla" /></div>
                </div>
                <div className="space-y-2"><Label>Color</Label><Input placeholder="White" /></div>
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
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono font-bold text-primary">
                        {c.plate}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{c.make} {c.model}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.year}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.color}</TableCell>
                    <TableCell>{owner?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setViewId(c.id)}>
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
                    No cars found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DataCard>

      <Dialog open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewing?.plate} — {viewing?.make} {viewing?.model}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-4">
                <div><p className="text-muted-foreground">Year</p><p className="font-semibold">{viewing.year}</p></div>
                <div><p className="text-muted-foreground">Color</p><p className="font-semibold">{viewing.color}</p></div>
                <div><p className="text-muted-foreground">Owner</p><p className="font-semibold">{viewingOwner?.name}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-semibold">{viewingOwner?.phone}</p></div>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold"><Wrench className="h-4 w-4" /> Service History</h3>
                <div className="divide-y rounded-lg border">
                  {viewingHistory.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">No service records yet.</p>
                  )}
                  {viewingHistory.map((s) => (
                    <div key={s.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{s.problem}</p>
                        <Badge variant="outline">{s.date}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Fix: {s.fix}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Labour {formatCurrency(s.labourCharge)} • Staff: {s.staff}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
