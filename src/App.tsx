import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedLayout from "@/components/ProtectedLayout";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Cars from "./pages/Cars";
import CarDetail from "./pages/CarDetail";
import Services from "./pages/Services";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Stock from "./pages/Stock";
import Users from "./pages/Users";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedLayout />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/cars" element={<Cars />} />
                <Route path="/cars/:id" element={<CarDetail />} />
                <Route path="/services" element={<Services />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/users" element={<Users />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
