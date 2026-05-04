import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, ShieldCheck, Trash2 } from "lucide-react";
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
import {
  createAdminRequest,
  deleteAdminRequest,
  listAdminsRequest,
  updateAdminRequest,
  type AdminUser,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type UiUser = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Staff";
  active: boolean;
};

const roleColors: Record<UiUser["role"], string> = {
  Admin: "bg-primary text-primary-foreground hover:bg-primary",
  Staff: "bg-secondary text-secondary-foreground hover:bg-secondary",
};

const toUiUser = (u: AdminUser): UiUser => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  role: u.role === "admin" ? "Admin" : "Staff",
  active: true,
});

export default function Users() {
  const { token, user: currentUser } = useAuth();
  const [list, setList] = useState<UiUser[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UiUser | null>(null);
  const [role, setRole] = useState<UiUser["role"]>("Staff");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const filtered = list.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const loadUsers = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await listAdminsRequest(token);
        setList(response.data.map(toUiUser));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load users.");
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [token]);

  const openAdd = () => { setEditing(null); setRole("Admin"); setActive(true); setOpen(true); };
  const openEdit = (u: UiUser) => { setEditing(u); setRole(u.role); setActive(u.active); setOpen(true); };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    const f = new FormData(e.currentTarget);
    const data = { name: String(f.get("name")), email: String(f.get("email")), role, active };
    const password = String(f.get("password") ?? "");

    setSubmitting(true);

    if (editing) {
      try {
        const response = await updateAdminRequest(token, editing.id, {
          name: data.name,
          email: data.email,
          role: role === "Admin" ? "admin" : "user",
          ...(password.trim() ? { password: password.trim() } : {}),
        });
        setList((prev) => prev.map((u) => (u.id === editing.id ? toUiUser(response.data) : u)));
        toast.success("User updated");
        setOpen(false);
        setEditing(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update user.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.trim().length < 8) {
      toast.error("Password must be at least 8 characters.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await createAdminRequest(token, {
        name: data.name,
        email: data.email,
        password: password.trim(),
        role: role === "Admin" ? "admin" : "user",
      });
      setList((prev) => [toUiUser(response.data), ...prev]);
      toast.success("User created");
      setOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    try {
      await deleteAdminRequest(token, userId);
      setList((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove user.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage admins, managers, and staff who use the system. New users are created via admin API."
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
                    <Select value={role} onValueChange={(v) => setRole(v as UiUser["role"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
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
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input name="password" type="password" minLength={8} required placeholder="At least 8 characters" />
                  </div>
                )}
                {editing && (
                  <div className="space-y-2">
                    <Label>New Password (optional)</Label>
                    <Input name="password" type="password" minLength={8} placeholder="Leave empty to keep current password" />
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                    {editing ? "Update User" : submitting ? "Saving..." : "Save User"}
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
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading users...</span>
                  </TableCell>
                </TableRow>
              )}
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
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={String(currentUser?.id) === u.id}
                        onClick={() => void handleDelete(u.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No users found.
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
