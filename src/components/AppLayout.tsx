import { Outlet, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Search, UserCircle2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur md:px-6">
            <SidebarTrigger className="text-foreground" />
            <div className="hidden flex-1 max-w-md md:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Quick search…"
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto gap-2 rounded-full bg-secondary px-3 py-1.5 pr-2 hover:bg-secondary/80"
                  >
                    <UserCircle2 className="h-6 w-6 shrink-0 text-primary" />
                    <div className="hidden text-left sm:block">
                      <p className="max-w-[140px] truncate text-xs font-semibold leading-tight">
                        {user?.name ?? "User"}
                      </p>
                      <p className="max-w-[140px] truncate text-[10px] leading-tight text-muted-foreground">
                        {user?.role ?? ""}
                      </p>
                    </div>
                    <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
