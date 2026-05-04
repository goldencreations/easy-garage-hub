const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("Missing VITE_API_BASE_URL. Add it to your .env file.");
}

const API_BASE_URL = apiBaseUrl.replace(/\/$/, "");

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
};

export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  role: string;
};

export type AuthPayload = {
  token: string;
  user: AuthUser;
};

export type AdminUser = {
  id: number | string;
  name: string;
  email: string;
  role: "admin" | "user";
  created_at?: string;
  updated_at?: string;
};

export type CustomerApi = {
  id: number | string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  cars_count?: number;
};

export type CarApi = {
  id: number | string;
  customer_id: number | string;
  plate_number: string;
  vehicle_type: string;
  model_year: string;
  color: string;
  customer?: CustomerApi;
};

export type StaffApi = {
  id: number | string;
  name: string;
  skills: string;
  phone: string;
};

export type StockCategoryApi = {
  id: number | string;
  name: string;
  stocks_count?: number;
};

export type StockApi = {
  id: number | string;
  name: string;
  quantity: number;
  status: "available" | "low" | "out_of_stock";
  stock_category_id: number | string;
  price: number;
  category?: StockCategoryApi;
};

export type ServiceStatus = "pending" | "onprogress" | "complete";

export type ServiceApi = {
  id: number | string;
  date: string;
  customer_id: number | string;
  car_id: number | string;
  leading_staff_id: number | string;
  problem: string;
  fix?: string | null;
  cost_total: number;
  status: ServiceStatus;
  customer?: CustomerApi;
  car?: CarApi;
  leading_staff?: StaffApi;
  stocks?: Array<StockApi & { pivot?: { quantity: number } }>;
};

export type InvoiceItemApi = {
  id?: number | string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_type?: "stock" | "labor" | "custom";
};

export type InvoiceApi = {
  id: number | string;
  invoice_number: string;
  date: string;
  customer_id: number | string;
  car_id: number | string;
  service_id?: number | string | null;
  payment_status: "unpaid" | "partial" | "paid";
  total: number;
  items: InvoiceItemApi[];
  customer?: CustomerApi;
  car?: CarApi;
  service?: ServiceApi;
};

export type ExpenseApi = {
  id: number | string;
  date: string;
  category: "stock_purchase" | "salary" | "operation" | "other";
  title: string;
  description?: string | null;
  amount: number;
};

export type AdminStatsFilter = "weekly" | "monthly" | "yearly";

export type AdminStatsApi = {
  filter: AdminStatsFilter;
  from_date: string;
  to_date: string;
  customers_count: number;
  cars_count: number;
  invoices_count: number;
  stock_items_count: number;
  expenses_count: number;
  revenues_total: number;
  expenses_total: number;
  low_stock_count: number;
  low_stock_items: Array<{
    id: number | string;
    name: string;
    quantity: number;
    status: string;
    stock_category_id: number | string;
    price: number;
  }>;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Ignore malformed/empty JSON so we can provide a clean fallback error.
  }

  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed.");
  }

  if (!payload) {
    throw new Error("Empty server response.");
  }

  return payload;
}

export function loginRequest(email: string, password: string) {
  return apiRequest<AuthPayload>("/login", {
    method: "POST",
    body: { email, password },
  });
}

export function forgotPasswordRequest(email: string) {
  return apiRequest<[] | Record<string, never>>("/password/forgot", {
    method: "POST",
    body: { email },
  });
}

export function logoutRequest(token: string) {
  return apiRequest<[] | Record<string, never>>("/logout", {
    method: "POST",
    token,
  });
}

export function createAdminRequest(
  token: string,
  payload: { name: string; email: string; password: string; role: "admin" | "user" },
) {
  return apiRequest<AuthUser>("/admins", {
    method: "POST",
    token,
    body: payload,
  });
}

export function listAdminsRequest(token: string) {
  return apiRequest<AdminUser[]>("/admins", {
    method: "GET",
    token,
  });
}

export function updateAdminRequest(
  token: string,
  userId: string | number,
  payload: { name: string; email: string; role: "admin" | "user"; password?: string },
) {
  return apiRequest<AdminUser>(`/admins/${userId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteAdminRequest(token: string, userId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/admins/${userId}`, {
    method: "DELETE",
    token,
  });
}

export function listCustomersRequest(token: string) {
  return apiRequest<CustomerApi[]>("/customers", {
    method: "GET",
    token,
  });
}

export function createCustomerRequest(
  token: string,
  payload: { name: string; phone: string; email?: string; address?: string },
) {
  return apiRequest<CustomerApi>("/customers", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateCustomerRequest(
  token: string,
  customerId: string | number,
  payload: { name: string; phone: string; email?: string; address?: string },
) {
  return apiRequest<CustomerApi>(`/customers/${customerId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteCustomerRequest(token: string, customerId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/customers/${customerId}`, {
    method: "DELETE",
    token,
  });
}

export function listCarsRequest(token: string) {
  return apiRequest<CarApi[]>("/cars", {
    method: "GET",
    token,
  });
}

export function createCarRequest(
  token: string,
  payload: {
    customer_id: string | number;
    plate_number: string;
    vehicle_type: string;
    model_year: string;
    color: string;
  },
) {
  return apiRequest<CarApi>("/cars", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateCarRequest(
  token: string,
  carId: string | number,
  payload: {
    customer_id: string | number;
    plate_number: string;
    vehicle_type: string;
    model_year: string;
    color: string;
  },
) {
  return apiRequest<CarApi>(`/cars/${carId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteCarRequest(token: string, carId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/cars/${carId}`, {
    method: "DELETE",
    token,
  });
}

export function listStaffRequest(token: string) {
  return apiRequest<StaffApi[]>("/staff", {
    method: "GET",
    token,
  });
}

export function createStaffRequest(token: string, payload: { name: string; skills: string; phone: string }) {
  return apiRequest<StaffApi>("/staff", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateStaffRequest(
  token: string,
  staffId: string | number,
  payload: { name: string; skills: string; phone: string },
) {
  return apiRequest<StaffApi>(`/staff/${staffId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteStaffRequest(token: string, staffId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/staff/${staffId}`, {
    method: "DELETE",
    token,
  });
}

export function listStockCategoriesRequest(token: string) {
  return apiRequest<StockCategoryApi[]>("/stock-categories", {
    method: "GET",
    token,
  });
}

export function createStockCategoryRequest(token: string, payload: { name: string }) {
  return apiRequest<StockCategoryApi>("/stock-categories", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateStockCategoryRequest(token: string, categoryId: string | number, payload: { name: string }) {
  return apiRequest<StockCategoryApi>(`/stock-categories/${categoryId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteStockCategoryRequest(token: string, categoryId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/stock-categories/${categoryId}`, {
    method: "DELETE",
    token,
  });
}

export function listStocksRequest(token: string) {
  return apiRequest<StockApi[]>("/stocks", {
    method: "GET",
    token,
  });
}

export function createStockRequest(
  token: string,
  payload: {
    name: string;
    quantity: number;
    status: "available" | "low" | "out_of_stock";
    stock_category_id: string | number;
    price: number;
  },
) {
  return apiRequest<StockApi>("/stocks", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateStockRequest(
  token: string,
  stockId: string | number,
  payload: {
    name: string;
    quantity: number;
    status: "available" | "low" | "out_of_stock";
    stock_category_id: string | number;
    price: number;
  },
) {
  return apiRequest<StockApi>(`/stocks/${stockId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteStockRequest(token: string, stockId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/stocks/${stockId}`, {
    method: "DELETE",
    token,
  });
}

export function listServicesRequest(token: string) {
  return apiRequest<ServiceApi[]>("/services", {
    method: "GET",
    token,
  });
}

export function createServiceRequest(
  token: string,
  payload: {
    date: string;
    customer_id: string | number;
    car_id: string | number;
    leading_staff_id: string | number;
    problem: string;
    fix?: string;
    status: ServiceStatus;
    stock_items?: Array<{ stock_id: string | number; quantity: number }>;
  },
) {
  return apiRequest<ServiceApi>("/services", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateServiceRequest(
  token: string,
  serviceId: string | number,
  payload: {
    date: string;
    customer_id: string | number;
    car_id: string | number;
    leading_staff_id: string | number;
    problem: string;
    fix?: string;
    status: ServiceStatus;
    stock_items?: Array<{ stock_id: string | number; quantity: number }>;
  },
) {
  return apiRequest<ServiceApi>(`/services/${serviceId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function updateServiceStatusRequest(token: string, serviceId: string | number, status: ServiceStatus) {
  return apiRequest<ServiceApi>(`/services/${serviceId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export function deleteServiceRequest(token: string, serviceId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/services/${serviceId}`, {
    method: "DELETE",
    token,
  });
}

export function listInvoicesRequest(token: string) {
  return apiRequest<InvoiceApi[]>("/invoices", {
    method: "GET",
    token,
  });
}

export function createInvoiceRequest(
  token: string,
  payload: {
    invoice_number: string;
    date: string;
    customer_id: string | number;
    car_id: string | number;
    service_id?: string | number;
    payment_status: "unpaid" | "partial" | "paid";
    items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      item_type?: "labor" | "custom";
    }>;
  },
) {
  return apiRequest<InvoiceApi>("/invoices", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateInvoicePaymentStatusRequest(
  token: string,
  invoiceId: string | number,
  payment_status: "unpaid" | "partial" | "paid",
) {
  return apiRequest<InvoiceApi>(`/invoices/${invoiceId}/payment-status`, {
    method: "PATCH",
    token,
    body: { payment_status },
  });
}

export function deleteInvoiceRequest(token: string, invoiceId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/invoices/${invoiceId}`, {
    method: "DELETE",
    token,
  });
}

export function listExpensesRequest(token: string) {
  return apiRequest<ExpenseApi[]>("/expenses", {
    method: "GET",
    token,
  });
}

export function createExpenseRequest(
  token: string,
  payload: {
    date: string;
    category: "stock_purchase" | "salary" | "operation" | "other";
    title: string;
    description?: string;
    amount: number;
  },
) {
  return apiRequest<ExpenseApi>("/expenses", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateExpenseRequest(
  token: string,
  expenseId: string | number,
  payload: {
    date: string;
    category: "stock_purchase" | "salary" | "operation" | "other";
    title: string;
    description?: string;
    amount: number;
  },
) {
  return apiRequest<ExpenseApi>(`/expenses/${expenseId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteExpenseRequest(token: string, expenseId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/expenses/${expenseId}`, {
    method: "DELETE",
    token,
  });
}

export function adminStatsRequest(token: string, filter: AdminStatsFilter) {
  return apiRequest<AdminStatsApi>(`/admins/stats?filter=${filter}`, {
    method: "GET",
    token,
  });
}
