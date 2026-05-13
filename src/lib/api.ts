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
  model_year?: string | null;
  color?: string | null;
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
  quantity: number | string;
  status: "available" | "low" | "out_of_stock";
  stock_category_id: number | string;
  price: number | string;
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
  cost_total: number | string;
  status: ServiceStatus;
  customer?: CustomerApi;
  car?: CarApi;
  leading_staff?: StaffApi;
  stocks?: Array<StockApi & { pivot?: { quantity: number | string } }>;
};

export type InvoiceItemApi = {
  id?: number | string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  item_type?: "stock" | "labor" | "custom";
  stock_id?: number | string | null;
  service_id?: number | string | null;
  position?: number;
};

export type InvoicePaymentApi = {
  id: number | string;
  invoice_id?: number | string;
  amount: number | string;
  paid_at?: string;
  note?: string | null;
};

export type InvoiceApi = {
  id: number | string;
  invoice_number: string;
  date: string;
  customer_id: number | string;
  car_id: number | string;
  service_id?: number | string | null;
  payment_status: "unpaid" | "partial" | "paid";
  total: number | string;
  items: InvoiceItemApi[];
  /** Sum of recorded payments (from API). */
  amount_paid?: number | string;
  /** Remaining balance (from API). */
  amount_due?: number | string;
  payments?: InvoicePaymentApi[];
  customer?: CustomerApi;
  car?: CarApi;
  service?: ServiceApi;
};

export type CarDetailsApi = {
  car: CarApi & {
    customer?: CustomerApi;
    services?: ServiceApi[];
    invoices?: InvoiceApi[];
  };
  history?: {
    services_count: number;
    invoices_count: number;
  };
};

export type CustomerDetailsApi = {
  customer: CustomerApi & {
    cars?: Array<
      CarApi & {
        services?: ServiceApi[];
        invoices?: InvoiceApi[];
      }
    >;
    services?: ServiceApi[];
    invoices?: InvoiceApi[];
  };
  history?: {
    cars_count: number;
    services_count: number;
    invoices_count: number;
  };
};

export type ExpenseApi = {
  id: number | string;
  date: string;
  category: "stock_purchase" | "salary" | "operation" | "other";
  title: string;
  description?: string | null;
  amount: number;
  /** Balance brought down */
  balance_bd?: number | string | null;
  /** Balance carried down */
  balance_cd?: number | string | null;
};

export type CreditPurchasePaymentStatus = "unpaid" | "partial" | "paid";

export type CreditPurchaseApi = {
  id: number | string;
  item_name: string;
  supplier_name: string;
  total_amount: number | string;
  amount_paid: number | string;
  amount_due: number | string;
  payment_status: CreditPurchasePaymentStatus;
  date: string;
  expense_id?: number | string | null;
  expense?: ExpenseApi | null;
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

export function listAdminsRequest(token: string, params?: { search?: string; role?: "admin" | "user" | "" }) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.role) query.set("role", params.role);
  return apiRequest<AdminUser[]>(`/admins${query.toString() ? `?${query.toString()}` : ""}`, {
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

export function listCustomersRequest(token: string, params?: { search?: string }) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  return apiRequest<CustomerApi[]>(`/customers${query.toString() ? `?${query.toString()}` : ""}`, {
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

export function listCarsRequest(token: string, params?: { search?: string; customer_id?: string | number }) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.customer_id !== undefined && params?.customer_id !== null && String(params.customer_id) !== "") {
    query.set("customer_id", String(params.customer_id));
  }
  return apiRequest<CarApi[]>(`/cars${query.toString() ? `?${query.toString()}` : ""}`, {
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
    model_year?: string;
    color?: string;
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
    model_year?: string;
    color?: string;
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

export function carDetailsRequest(token: string, carId: string | number) {
  return apiRequest<CarDetailsApi>(`/cars/${carId}/details`, {
    method: "GET",
    token,
  });
}

export function customerDetailsRequest(token: string, customerId: string | number) {
  return apiRequest<CustomerDetailsApi>(`/customers/${customerId}/details`, {
    method: "GET",
    token,
  });
}

export function listStaffRequest(token: string, params?: { search?: string }) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  return apiRequest<StaffApi[]>(`/staff${query.toString() ? `?${query.toString()}` : ""}`, {
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

export function listStockCategoriesRequest(token: string, params?: { search?: string }) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  return apiRequest<StockCategoryApi[]>(`/stock-categories${query.toString() ? `?${query.toString()}` : ""}`, {
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

export function listStocksRequest(token: string, params?: { search?: string; status?: StockApi["status"] | ""; stock_category_id?: string | number }) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.status) query.set("status", params.status);
  if (params?.stock_category_id !== undefined && params?.stock_category_id !== null && String(params.stock_category_id) !== "") {
    query.set("stock_category_id", String(params.stock_category_id));
  }
  return apiRequest<StockApi[]>(`/stocks${query.toString() ? `?${query.toString()}` : ""}`, {
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

export function restockStockRequest(token: string, stockId: string | number, quantity: number) {
  return apiRequest<StockApi>(`/stocks/${stockId}/restock`, {
    method: "PATCH",
    token,
    body: { quantity },
  });
}

export function listServicesRequest(
  token: string,
  params?: {
    search?: string;
    status?: ServiceStatus | "";
    customer_id?: string | number;
    car_id?: string | number;
    leading_staff_id?: string | number;
  },
) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.status) query.set("status", params.status);
  if (params?.customer_id !== undefined && params?.customer_id !== null && String(params.customer_id) !== "") query.set("customer_id", String(params.customer_id));
  if (params?.car_id !== undefined && params?.car_id !== null && String(params.car_id) !== "") query.set("car_id", String(params.car_id));
  if (params?.leading_staff_id !== undefined && params?.leading_staff_id !== null && String(params.leading_staff_id) !== "") query.set("leading_staff_id", String(params.leading_staff_id));
  return apiRequest<ServiceApi[]>(`/services${query.toString() ? `?${query.toString()}` : ""}`, {
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

export function listInvoicesRequest(
  token: string,
  params?: {
    search?: string;
    payment_status?: InvoiceApi["payment_status"] | "";
    customer_id?: string | number;
    car_id?: string | number;
  },
) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.payment_status) query.set("payment_status", params.payment_status);
  if (params?.customer_id !== undefined && params?.customer_id !== null && String(params.customer_id) !== "") query.set("customer_id", String(params.customer_id));
  if (params?.car_id !== undefined && params?.car_id !== null && String(params.car_id) !== "") query.set("car_id", String(params.car_id));
  return apiRequest<InvoiceApi[]>(`/invoices${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
    token,
  });
}

export type InvoiceItemPayload = {
  item_type: "labor" | "custom" | "stock";
  description?: string;
  /** Numeric string (e.g. "2") or label such as "SET" per API. */
  quantity: string | number;
  unit_price?: number;
  line_total?: number;
  stock_id?: string | number;
  position?: number;
};

export function createInvoiceRequest(
  token: string,
  payload: {
    /** Omit when the server auto-generates invoice numbers. */
    invoice_number?: string;
    date: string;
    customer_id: string | number;
    car_id: string | number;
    service_id?: string | number;
    payment_status: "unpaid" | "partial" | "paid";
    invoice_items?: InvoiceItemPayload[];
    stock_items?: Array<{ stock_id: string | number; quantity: number }>;
    items?: Array<{
      description: string;
      quantity: string | number;
      unit_price: number;
      item_type?: "labor" | "custom";
      line_total?: number;
    }>;
  },
) {
  return apiRequest<InvoiceApi>("/invoices", {
    method: "POST",
    token,
    body: payload,
  });
}

export function getInvoiceRequest(token: string, invoiceId: string | number) {
  return apiRequest<InvoiceApi>(`/invoices/${invoiceId}`, {
    method: "GET",
    token,
  });
}

export function updateInvoiceRequest(
  token: string,
  invoiceId: string | number,
  payload: {
    invoice_number?: string;
    date?: string;
    customer_id?: string | number;
    car_id?: string | number;
    service_id?: string | number | null;
    payment_status?: "unpaid" | "partial" | "paid";
    invoice_items?: InvoiceItemPayload[];
    stock_items?: Array<{ stock_id: string | number; quantity: number }>;
    items?: Array<{
      description: string;
      quantity: string | number;
      unit_price: number;
      item_type?: "labor" | "custom";
      line_total?: number;
    }>;
  },
) {
  return apiRequest<InvoiceApi>(`/invoices/${invoiceId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function recordInvoicePaymentRequest(
  token: string,
  invoiceId: string | number,
  payload: { amount: number; paid_at?: string; note?: string },
) {
  return apiRequest<InvoiceApi>(`/invoices/${invoiceId}/payments`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateInvoicePaymentRequest(
  token: string,
  invoiceId: string | number,
  paymentId: string | number,
  payload: { amount?: number; paid_at?: string | null; note?: string | null },
) {
  return apiRequest<InvoiceApi>(`/invoices/${invoiceId}/payments/${paymentId}`, {
    method: "PATCH",
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

export function listExpensesRequest(token: string, params?: { search?: string; category?: ExpenseApi["category"] | "" }) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.category) query.set("category", params.category);
  return apiRequest<ExpenseApi[]>(`/expenses${query.toString() ? `?${query.toString()}` : ""}`, {
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
    balance_bd?: number;
    balance_cd?: number;
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
    balance_bd?: number;
    balance_cd?: number;
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

export function openingBalanceSuggestionRequest(token: string, date: string) {
  const query = new URLSearchParams({ date });
  return apiRequest<{
    suggested_balance_bd: string | null;
    from_expense_id?: number | string | null;
    from_date?: string | null;
  }>(`/expenses/opening-balance-suggestion?${query.toString()}`, {
    method: "GET",
    token,
  });
}

export function listCreditPurchasesRequest(
  token: string,
  params?: {
    search?: string;
    payment_status?: CreditPurchasePaymentStatus | "";
    supplier_name?: string;
  },
) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.payment_status) query.set("payment_status", params.payment_status);
  if (params?.supplier_name?.trim()) query.set("supplier_name", params.supplier_name.trim());
  return apiRequest<CreditPurchaseApi[]>(`/credit-purchases${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
    token,
  });
}

export function createCreditPurchaseRequest(
  token: string,
  payload: {
    item_name: string;
    supplier_name: string;
    total_amount: number;
    amount_paid?: number;
    date: string;
  },
) {
  return apiRequest<CreditPurchaseApi>("/credit-purchases", {
    method: "POST",
    token,
    body: payload,
  });
}

export function getCreditPurchaseRequest(token: string, creditPurchaseId: string | number) {
  return apiRequest<CreditPurchaseApi>(`/credit-purchases/${creditPurchaseId}`, {
    method: "GET",
    token,
  });
}

export function updateCreditPurchaseRequest(
  token: string,
  creditPurchaseId: string | number,
  payload: {
    item_name?: string;
    supplier_name?: string;
    total_amount?: number;
    amount_paid?: number;
    date?: string;
  },
) {
  return apiRequest<CreditPurchaseApi>(`/credit-purchases/${creditPurchaseId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function deleteCreditPurchaseRequest(token: string, creditPurchaseId: string | number) {
  return apiRequest<[] | Record<string, never>>(`/credit-purchases/${creditPurchaseId}`, {
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
