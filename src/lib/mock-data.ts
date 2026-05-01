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
  { id: "c1", name: "John Mwangi", phone: "+254 712 345 678", email: "john@example.com", address: "Nairobi, Kenya", carIds: ["v1", "v2"], createdAt: "2025-01-12" },
  { id: "c2", name: "Aisha Hassan", phone: "+254 722 111 222", email: "aisha@example.com", address: "Mombasa, Kenya", carIds: ["v3"], createdAt: "2025-02-04" },
  { id: "c3", name: "Peter Otieno", phone: "+254 733 555 444", email: "peter@example.com", address: "Kisumu, Kenya", carIds: ["v4"], createdAt: "2025-03-18" },
  { id: "c4", name: "Mary Wambui", phone: "+254 700 909 808", email: "mary@example.com", address: "Nakuru, Kenya", carIds: ["v5"], createdAt: "2025-04-22" },
  { id: "c5", name: "Samuel Kiprop", phone: "+254 711 222 333", email: "sam@example.com", address: "Eldoret, Kenya", carIds: ["v6"], createdAt: "2026-01-08" },
];

export const cars: Car[] = [
  { id: "v1", plate: "KDA 123A", make: "Toyota", model: "Corolla", year: 2018, color: "White", customerId: "c1" },
  { id: "v2", plate: "KDB 456B", make: "Nissan", model: "X-Trail", year: 2020, color: "Black", customerId: "c1" },
  { id: "v3", plate: "KCC 789C", make: "Mazda", model: "Demio", year: 2017, color: "Silver", customerId: "c2" },
  { id: "v4", plate: "KDD 321D", make: "Honda", model: "Fit", year: 2019, color: "Blue", customerId: "c3" },
  { id: "v5", plate: "KDE 654E", make: "Subaru", model: "Forester", year: 2021, color: "Grey", customerId: "c4" },
  { id: "v6", plate: "KDF 987F", make: "Toyota", model: "Hilux", year: 2022, color: "Red", customerId: "c5" },
];

export const services: ServiceRecord[] = [
  { id: "s1", carId: "v1", date: "2026-04-12", problem: "Engine overheating", diagnosis: "Faulty thermostat", fix: "Replaced thermostat & coolant", partsUsed: [{ name: "Thermostat", qty: 1, price: 2500 }, { name: "Coolant 4L", qty: 1, price: 1800 }], labourCharge: 3000, staff: "James", status: "Completed" },
  { id: "s2", carId: "v1", date: "2026-02-20", problem: "Brake noise", diagnosis: "Worn brake pads", fix: "Replaced front brake pads", partsUsed: [{ name: "Brake pads (front)", qty: 1, price: 4500 }], labourCharge: 2000, staff: "Kevin", status: "Completed" },
  { id: "s3", carId: "v3", date: "2026-04-25", problem: "Battery dead", diagnosis: "Old battery", fix: "Replaced battery", partsUsed: [{ name: "Battery 12V", qty: 1, price: 12000 }], labourCharge: 1000, staff: "James", status: "Completed" },
  { id: "s4", carId: "v5", date: "2026-04-28", problem: "Oil leak", diagnosis: "Worn gasket", fix: "Replacing gasket", partsUsed: [{ name: "Gasket", qty: 1, price: 3500 }], labourCharge: 4000, staff: "Kevin", status: "In Progress" },
  { id: "s5", carId: "v2", date: "2026-04-30", problem: "AC not cooling", diagnosis: "Low refrigerant", fix: "Pending diagnosis", partsUsed: [], labourCharge: 0, staff: "James", status: "Pending" },
];

export const invoices: Invoice[] = [
  { id: "i1", number: "INV-2026-0001", customerId: "c1", carId: "v1", date: "2026-04-12", items: [{ description: "Thermostat", qty: 1, price: 2500 }, { description: "Coolant 4L", qty: 1, price: 1800 }], labour: 3000, total: 7300, paid: true, staff: "Admin" },
  { id: "i2", number: "INV-2026-0002", customerId: "c2", carId: "v3", date: "2026-04-25", items: [{ description: "Battery 12V", qty: 1, price: 12000 }], labour: 1000, total: 13000, paid: true, staff: "Manager" },
  { id: "i3", number: "INV-2026-0003", customerId: "c1", carId: "v1", date: "2026-02-20", items: [{ description: "Brake pads (front)", qty: 1, price: 4500 }], labour: 2000, total: 6500, paid: true, staff: "Admin" },
  { id: "i4", number: "INV-2026-0004", customerId: "c4", carId: "v5", date: "2026-04-28", items: [{ description: "Gasket", qty: 1, price: 3500 }], labour: 4000, total: 7500, paid: false, staff: "Staff" },
];

export const expenses: Expense[] = [
  { id: "e1", name: "Workshop rent", category: "Rent", amount: 45000, date: "2026-04-01", description: "Monthly rent April", recordedBy: "Admin" },
  { id: "e2", name: "Electricity bill", category: "Utilities", amount: 8500, date: "2026-04-05", description: "March electricity", recordedBy: "Manager" },
  { id: "e3", name: "Cleaning supplies", category: "Supplies", amount: 1200, date: "2026-04-10", description: "Workshop cleaning items", recordedBy: "Staff" },
  { id: "e4", name: "Tool repair", category: "Tools", amount: 3500, date: "2026-04-15", description: "Repaired air compressor", recordedBy: "Admin" },
];

export const stock: StockItem[] = [
  { id: "p1", name: "Engine Oil 5W-30", category: "Lubricants", price: 1800, quantity: 24, lowStockThreshold: 10 },
  { id: "p2", name: "Brake Pads (front)", category: "Brakes", price: 4500, quantity: 8, lowStockThreshold: 10 },
  { id: "p3", name: "Battery 12V", category: "Electrical", price: 12000, quantity: 5, lowStockThreshold: 6 },
  { id: "p4", name: "Air Filter", category: "Filters", price: 1200, quantity: 18, lowStockThreshold: 8 },
  { id: "p5", name: "Spark Plug", category: "Engine", price: 600, quantity: 40, lowStockThreshold: 20 },
  { id: "p6", name: "Coolant 4L", category: "Lubricants", price: 1800, quantity: 3, lowStockThreshold: 5 },
];

export const users: User[] = [
  { id: "u1", name: "David Kamau", email: "david@garage.com", role: "Admin", active: true },
  { id: "u2", name: "James Otieno", email: "james@garage.com", role: "Manager", active: true },
  { id: "u3", name: "Kevin Mutua", email: "kevin@garage.com", role: "Staff", active: true },
  { id: "u4", name: "Grace Akinyi", email: "grace@garage.com", role: "Staff", active: false },
];

export const formatCurrency = (n: number) => `KSh ${n.toLocaleString()}`;
