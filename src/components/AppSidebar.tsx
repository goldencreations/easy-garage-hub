import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Car,
  Wrench,
  FileText,
  Receipt,
  BadgeDollarSign,
  Package,
  UserCog,
  UserRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Cars", url: "/cars", icon: Car },
  { title: "Services", url: "/services", icon: Wrench },
  { title: "Staff", url: "/staff", icon: UserRound },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Credit Purchases", url: "/credit-purchases", icon: BadgeDollarSign },
  { title: "Stock", url: "/stock", icon: Package },
  { title: "Users", url: "/users", icon: UserCog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <img src="/aziziumemelogo.png" alt="AZIZI AUTOMOTIVE GARAGE logo" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-1 shadow-glow" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-bold text-sidebar-foreground">
                AZIZI AUTOMOTIVE
              </p>
              <p className="text-sm font-bold text-sidebar-foreground">
                GARAGE
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="h-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold"
                    tooltip={item.title}
                  >
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
