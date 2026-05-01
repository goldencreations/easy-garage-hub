import { useState } from "react";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
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
import { customers as initialCustomers, cars } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Customers() {
  const [list, setList] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = list.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newCustomer = {
      id: `c${Date.now()}`,
      name: String(f.get("name")),
      phone: String(f.get("phone")),
      email: String(f.get("email")),
      address: String(f.get("address")),
      carIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setList([newCustomer, ...list]);
    setOpen(false);
    toast.success("Customer added");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Add, search, and manage your garage customers."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md">
                <Plus className="mr-2 h-5 w-5" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input name="name" required placeholder="e.g. John Mwangi" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input name="phone" required placeholder="+254 7…" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input name="email" type="email" placeholder="name@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea name="address" placeholder="City / Town" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-primary">Save Customer</Button>
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
              {filtered.map((c) => {
                const owned = cars.filter((v) => v.customerId === c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.address}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{owned.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => toast(`Viewing ${c.name}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => toast("Edit form")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setList(list.filter(x => x.id !== c.id)); toast.success("Customer removed"); }}>
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
