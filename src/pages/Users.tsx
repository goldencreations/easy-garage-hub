import { useState } from "react";
import { Plus, Pencil, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SearchBar } from "@/components/SearchBar";
import { ExportActions } from "@/components/ExportActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { users } from "@/lib/mock-data";
import { toast } from "sonner";

const roleColors: Record<string, string> = {
  Admin: "bg-primary text-primary-foreground hover:bg-primary",
  Manager: "bg-accent text-accent-foreground hover:bg-accent",
  Staff: "bg-secondary text-secondary-foreground hover:bg-secondary",
};

export default function Users() {
  const [query, setQuery] = useState("");
  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage admins, managers, and staff who use the system."
        actions={
          <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-md" onClick={() => toast("User form")}>
            <Plus className="mr-2 h-5 w-5" /> Add User
          </Button>
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
                  <TableCell>
                    <Badge className={roleColors[u.role]}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        u.active
                          ? "bg-success text-success-foreground hover:bg-success"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }
                    >
                      {u.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => toast("Edit user")}>
                      <Pencil className="mr-1 h-4 w-4" /> Edit
                    </Button>
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
