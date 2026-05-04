import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, UserCog } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createStaffRequest,
  deleteStaffRequest,
  listStaffRequest,
  updateStaffRequest,
  type StaffApi,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Staff() {
  const { token } = useAuth();
  const [list, setList] = useState<StaffApi[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadStaff = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await listStaffRequest(token, { search: query });
        setList(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load staff.");
      } finally {
        setLoading(false);
      }
    };

    void loadStaff();
  }, [token, query]);

  const filtered = list;

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (staff: StaffApi) => {
    setEditing(staff);
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      toast.error("Your session is missing. Please sign in again.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      phone: String(form.get("phone")),
      skills: String(form.get("skills")),
    };

    setSubmitting(true);
    try {
      if (editing) {
        const response = await updateStaffRequest(token, editing.id, payload);
        setList((prev) => prev.map((staff) => (String(staff.id) === String(editing.id) ? response.data : staff)));
        toast.success("Staff updated");
      } else {
        const response = await createStaffRequest(token, payload);
        setList((prev) => [response.data, ...prev]);
        toast.success("Staff created");
      }
      setOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save staff.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (staffId: string | number) => {
    if (!token) return;
    try {
      await deleteStaffRequest(token, staffId);
      setList((prev) => prev.filter((staff) => String(staff.id) !== String(staffId)));
      toast.success("Staff removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove staff.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage workshop staff and their skills."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={openAdd}>
                <Plus className="mr-2 h-5 w-5" /> Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Update Staff" : "Add Staff"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="space-y-2"><Label>Name *</Label><Input name="name" required defaultValue={editing?.name} placeholder="e.g. James Mwakyusa" /></div>
                <div className="space-y-2"><Label>Phone *</Label><Input name="phone" required defaultValue={editing?.phone} placeholder="+255 7..." /></div>
                <div className="space-y-2"><Label>Skills *</Label><Textarea name="skills" required defaultValue={editing?.skills} placeholder="Engine, diagnostics, gearbox..." /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary" disabled={submitting}>
                    {submitting ? "Saving..." : editing ? "Update Staff" : "Save Staff"}
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
            <SearchBar value={query} onChange={setQuery} placeholder="Search by name, phone, skills..." />
            <ExportActions entity="staff" />
          </>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading staff...</span>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UserCog className="h-4 w-4" />
                      </div>
                      {staff.name}
                    </div>
                  </TableCell>
                  <TableCell>{staff.phone}</TableCell>
                  <TableCell className="max-w-xl">{staff.skills}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(staff)}>
                        <Pencil className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void handleDelete(staff.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No staff found.
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
