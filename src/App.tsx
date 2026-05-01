import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Cars from "./pages/Cars";
import Services from "./pages/Services";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Stock from "./pages/Stock";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/cars" element={<Cars />} />
            <Route path="/services" element={<Services />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
