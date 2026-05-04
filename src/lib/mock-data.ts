// Mock data simulating an API response. Easy to replace with real API calls.

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  carIds: string[];
  createdAt: string;
};

export type Car = {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  color: string;
  customerId: string;
};

export type ServiceRecord = {
  id: string;
  carId: string;
  date: string;
  problem: string;
  diagnosis: string;
  fix: string;
  partsUsed: { name: string; qty: number; price: number }[];
  labourCharge: number;
  staff: string;
  status: "Completed" | "In Progress" | "Pending";
};

export type Invoice = {
  id: string;
  number: string;
  customerId: string;
  carId: string;
  date: string;
  items: { description: string; qty: number; price: number }[];
  labour: number;
  total: number;
  paid: boolean;
  staff: string;
};

export type Expense = {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  recordedBy: string;
};

export type StockItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Staff";
  active: boolean;
};

export const customers: Customer[] = [
  { id: "c1", name: "Juma Mwakyusa", phone: "+255 712 345 678", email: "juma@example.com", address: "Dar es Salaam, Tanzania", carIds: ["v1", "v2"], createdAt: "2025-01-12" },
  { id: "c2", name: "Aisha Hassan", phone: "+255 754 111 222", email: "aisha@example.com", address: "Arusha, Tanzania", carIds: ["v3"], createdAt: "2025-02-04" },
  { id: "c3", name: "Peter Mushi", phone: "+255 762 555 444", email: "peter@example.com", address: "Mwanza, Tanzania", carIds: ["v4"], createdAt: "2025-03-18" },
  { id: "c4", name: "Mary Kimaro", phone: "+255 715 909 808", email: "mary@example.com", address: "Dodoma, Tanzania", carIds: ["v5"], createdAt: "2025-04-22" },
  { id: "c5", name: "Samuel Mwakalinga", phone: "+255 786 222 333", email: "sam@example.com", address: "Mbeya, Tanzania", carIds: ["v6"], createdAt: "2026-01-08" },
];

export const cars: Car[] = [
  { id: "v1", plate: "T 123 ABC", make: "Toyota", model: "Corolla", year: 2018, color: "White", customerId: "c1" },
  { id: "v2", plate: "T 456 DEF", make: "Nissan", model: "X-Trail", year: 2020, color: "Black", customerId: "c1" },
  { id: "v3", plate: "T 789 GHI", make: "Mazda", model: "Demio", year: 2017, color: "Silver", customerId: "c2" },
  { id: "v4", plate: "T 321 JKL", make: "Honda", model: "Fit", year: 2019, color: "Blue", customerId: "c3" },
  { id: "v5", plate: "T 654 MNO", make: "Subaru", model: "Forester", year: 2021, color: "Grey", customerId: "c4" },
  { id: "v6", plate: "T 987 PQR", make: "Toyota", model: "Hilux", year: 2022, color: "Red", customerId: "c5" },
];

export const services: ServiceRecord[] = [
  { id: "s1", carId: "v1", date: "2026-04-12", problem: "Engine overheating", diagnosis: "Faulty thermostat", fix: "Replaced thermostat & coolant", partsUsed: [{ name: "Thermostat", qty: 1, price: 25000 }, { name: "Coolant 4L", qty: 1, price: 18000 }], labourCharge: 30000, staff: "James", status: "Completed" },
  { id: "s2", carId: "v1", date: "2026-02-20", problem: "Brake noise", diagnosis: "Worn brake pads", fix: "Replaced front brake pads", partsUsed: [{ name: "Brake pads (front)", qty: 1, price: 45000 }], labourCharge: 20000, staff: "Kevin", status: "Completed" },
  { id: "s3", carId: "v3", date: "2026-04-25", problem: "Battery dead", diagnosis: "Old battery", fix: "Replaced battery", partsUsed: [{ name: "Battery 12V", qty: 1, price: 120000 }], labourCharge: 10000, staff: "James", status: "Completed" },
  { id: "s4", carId: "v5", date: "2026-04-28", problem: "Oil leak", diagnosis: "Worn gasket", fix: "Replacing gasket", partsUsed: [{ name: "Gasket", qty: 1, price: 35000 }], labourCharge: 40000, staff: "Kevin", status: "In Progress" },
  { id: "s5", carId: "v2", date: "2026-04-30", problem: "AC not cooling", diagnosis: "Low refrigerant", fix: "Pending diagnosis", partsUsed: [], labourCharge: 0, staff: "James", status: "Pending" },
];

export const invoices: Invoice[] = [
  { id: "i1", number: "INV-2026-0001", customerId: "c1", carId: "v1", date: "2026-04-12", items: [{ description: "Thermostat", qty: 1, price: 25000 }, { description: "Coolant 4L", qty: 1, price: 18000 }], labour: 30000, total: 73000, paid: true, staff: "Admin" },
  { id: "i2", number: "INV-2026-0002", customerId: "c2", carId: "v3", date: "2026-04-25", items: [{ description: "Battery 12V", qty: 1, price: 120000 }], labour: 10000, total: 130000, paid: true, staff: "Manager" },
  { id: "i3", number: "INV-2026-0003", customerId: "c1", carId: "v1", date: "2026-02-20", items: [{ description: "Brake pads (front)", qty: 1, price: 45000 }], labour: 20000, total: 65000, paid: true, staff: "Admin" },
  { id: "i4", number: "INV-2026-0004", customerId: "c4", carId: "v5", date: "2026-04-28", items: [{ description: "Gasket", qty: 1, price: 35000 }], labour: 40000, total: 75000, paid: false, staff: "Staff" },
];

export const expenses: Expense[] = [
  { id: "e1", name: "Workshop rent", category: "Rent", amount: 450000, date: "2026-04-01", description: "Monthly rent April", recordedBy: "Admin" },
  { id: "e2", name: "Electricity bill", category: "Utilities", amount: 85000, date: "2026-04-05", description: "March electricity", recordedBy: "Manager" },
  { id: "e3", name: "Cleaning supplies", category: "Supplies", amount: 12000, date: "2026-04-10", description: "Workshop cleaning items", recordedBy: "Staff" },
  { id: "e4", name: "Tool repair", category: "Tools", amount: 35000, date: "2026-04-15", description: "Repaired air compressor", recordedBy: "Admin" },
];

export const stock: StockItem[] = [
  { id: "p1", name: "Engine Oil 5W-30", category: "Lubricants", price: 18000, quantity: 24, lowStockThreshold: 10 },
  { id: "p2", name: "Brake Pads (front)", category: "Brakes", price: 45000, quantity: 8, lowStockThreshold: 10 },
  { id: "p3", name: "Battery 12V", category: "Electrical", price: 120000, quantity: 5, lowStockThreshold: 6 },
  { id: "p4", name: "Air Filter", category: "Filters", price: 12000, quantity: 18, lowStockThreshold: 8 },
  { id: "p5", name: "Spark Plug", category: "Engine", price: 6000, quantity: 40, lowStockThreshold: 20 },
  { id: "p6", name: "Coolant 4L", category: "Lubricants", price: 18000, quantity: 3, lowStockThreshold: 5 },
];

export const users: User[] = [
  { id: "u1", name: "David Mushi", email: "david@garage.co.tz", role: "Admin", active: true },
  { id: "u2", name: "James Mwakyusa", email: "james@garage.co.tz", role: "Manager", active: true },
  { id: "u3", name: "Kevin Mahenge", email: "kevin@garage.co.tz", role: "Staff", active: true },
  { id: "u4", name: "Grace Mollel", email: "grace@garage.co.tz", role: "Staff", active: false },
];

export const formatCurrency = (n: number | string) => {
  const value = typeof n === "string" ? Number(n.replace(/,/g, "").trim()) : n;
  const safe = Number.isFinite(value) ? value : 0;
  return `TSH ${safe.toLocaleString()}`;
};
