import { useState } from "react";
import { Plus, FileBarChart } from "lucide-react";
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
import { services as initialServices, cars, customers, users, formatCurrency, type ServiceRecord } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Services() {
  const [list, setList] = useState<ServiceRecord[]>(initialServices);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [carId, setCarId] = useState("");
  const [staff, setStaff] = useState("");
  const [status, setStatus] = useState<ServiceRecord["status"]>("Pending");

  const filtered = list.filter((s) => {
    const car = cars.find((c) => c.id === s.carId);
    const q = query.toLowerCase();
    return (
      car?.plate.toLowerCase().includes(q) ||
      s.problem.toLowerCase().includes(q) ||
      s.staff.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!carId || !staff) { toast.error("Select car and staff"); return; }
    const f = new FormData(e.currentTarget);
    const newRec: ServiceRecord = {
      id: `s${Date.now()}`,
      carId,
      date: String(f.get("date")) || new Date().toISOString().slice(0, 10),
      problem: String(f.get("problem")),
      diagnosis: String(f.get("diagnosis")),
      fix: String(f.get("fix")),
      partsUsed: [],
      labourCharge: Number(f.get("labour") || 0),
      staff,
      status,
    };
    setList([newRec, ...list]);
    setOpen(false);
    setCarId(""); setStaff(""); setStatus("Pending");
    toast.success("Service record added");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service & Repair History"
        description="Every problem, fix, part, and staff member — for every car."
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => toast.success("Yearly report generated")}>
              <FileBarChart className="mr-2 h-5 w-5" /> Yearly Report
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md">
                  <Plus className="mr-2 h-5 w-5" /> New Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>New Service Record</DialogTitle></DialogHeader>
                <form className="space-y-4" onSubmit={handleAdd}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Car *</Label>
                      <Select value={carId} onValueChange={setCarId}>
                        <SelectTrigger><SelectValue placeholder="Select car" /></SelectTrigger>
                        <SelectContent>
                          {cars.map((c) => {
                            const o = customers.find((x) => x.id === c.customerId);
                            return <SelectItem key={c.id} value={c.id}>{c.plate} — {o?.name}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Problem Reported *</Label><Input name="problem" required placeholder="e.g. Engine overheating" /></div>
                  <div className="space-y-2"><Label>Diagnosis</Label><Input name="diagnosis" placeholder="Mechanic's diagnosis" /></div>
                  <div className="space-y-2"><Label>Fix Performed</Label><Textarea name="fix" placeholder="Describe what was done" /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>Labour (TSH)</Label><Input name="labour" type="number" placeholder="0" /></div>
                    <div className="space-y-2">
                      <Label>Staff *</Label>
                      <Select value={staff} onValueChange={setStaff}>
                        <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                        <SelectContent>{users.filter(u => u.active).map((u) => (<SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as ServiceRecord["status"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-gradient-primary">Save Service</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

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
                <TableHead>Customer</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead className="hidden md:table-cell">Fix</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const car = cars.find((c) => c.id === s.carId);
                const cust = customers.find((c) => c.id === car?.customerId);
                const partsCost = s.partsUsed.reduce((sum, p) => sum + p.qty * p.price, 0);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{s.date}</TableCell>
                    <TableCell>
                      <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">{car?.plate}</span>
                    </TableCell>
                    <TableCell>{cust?.name}</TableCell>
                    <TableCell className="font-medium">{s.problem}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{s.fix}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(partsCost + s.labourCharge)}</TableCell>
                    <TableCell>{s.staff}</TableCell>
                    <TableCell>
                      <Badge className={
                        s.status === "Completed" ? "bg-success text-success-foreground hover:bg-success" :
                        s.status === "In Progress" ? "bg-warning text-warning-foreground hover:bg-warning" :
                        "bg-muted text-muted-foreground hover:bg-muted"
                      }>{s.status}</Badge>
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
