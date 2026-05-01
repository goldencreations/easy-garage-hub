import { useState } from "react";
import { Plus, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
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
import { Switch } from "@/components/ui/switch";
import { users as initialUsers, type User } from "@/lib/mock-data";
import { toast } from "sonner";

const roleColors: Record<string, string> = {
  Admin: "bg-primary text-primary-foreground hover:bg-primary",
  Manager: "bg-accent text-accent-foreground hover:bg-accent",
  Staff: "bg-secondary text-secondary-foreground hover:bg-secondary",
};

export default function Users() {
  const [list, setList] = useState<User[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [role, setRole] = useState<User["role"]>("Staff");
  const [active, setActive] = useState(true);

  const filtered = list.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setRole("Staff"); setActive(true); setOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setRole(u.role); setActive(u.active); setOpen(true); };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = { name: String(f.get("name")), email: String(f.get("email")), role, active };
    if (editing) {
      setList(list.map((u) => u.id === editing.id ? { ...editing, ...data } : u));
      toast.success("User updated");
    } else {
      setList([{ id: `u${Date.now()}`, ...data }, ...list]);
      toast.success("User added");
    }
    setOpen(false); setEditing(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage admins, managers, and staff who use the system."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={openAdd}>
                <Plus className="mr-2 h-5 w-5" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit User" : "Add New User"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="space-y-2"><Label>Full Name *</Label><Input name="name" required defaultValue={editing?.name} placeholder="e.g. David Mushi" /></div>
                <div className="space-y-2"><Label>Email *</Label><Input name="email" required type="email" defaultValue={editing?.email} placeholder="user@garage.co.tz" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as User["role"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch checked={active} onCheckedChange={setActive} />
                      <span className="text-sm">{active ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>
                {!editing && (
                  <div className="space-y-2"><Label>Temporary Password</Label><Input type="text" placeholder="Generated on save" disabled /></div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary">{editing ? "Update User" : "Save User"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataCard
        actions={
          <>
            <SearchBar value={query} onChange={setQuery} placeholder="Search users…" />
            <ExportActions entity="users" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      {u.name}
                    </div>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge className={roleColors[u.role]}>{u.role}</Badge></TableCell>
                  <TableCell>
                    <Badge className={u.active ? "bg-success text-success-foreground hover:bg-success" : "bg-muted text-muted-foreground hover:bg-muted"}>
                      {u.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                        <Pencil className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setList(list.filter(x => x.id !== u.id)); toast.success("User removed"); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataCard>
    </div>
  );
}
