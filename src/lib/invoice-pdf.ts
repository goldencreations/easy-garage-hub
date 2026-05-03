import { jsPDF } from "jspdf";
import type { Invoice, Customer, Car } from "./mock-data";
import { formatCurrency } from "./mock-data";

const MARGIN = 14;
const MAX_WIDTH = 182;

export function buildInvoicePdf(
  invoice: Invoice,
  customer: Customer,
  car: Car | undefined,
  options?: { regeneratedAt?: Date },
): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Easy Garage", MARGIN, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice", MARGIN, y);
  y += 7;

  doc.setFontSize(10);
  doc.text(`Invoice number: ${invoice.number}`, MARGIN, y);
  doc.text(`Date: ${invoice.date}`, 125, y);
  y += 6;

  doc.text(`Bill to: ${customer.name}`, MARGIN, y);
  y += 5;
  doc.text(`Phone: ${customer.phone}`, MARGIN, y);
  y += 5;
  doc.text(`Email: ${customer.email}`, MARGIN, y);
  y += 6;

  if (car) {
    doc.text(`Vehicle: ${car.plate} — ${car.make} ${car.model} (${car.year})`, MARGIN, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Line items", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const it of invoice.items) {
    const line = `${it.description}  ×${it.qty}  @ ${formatCurrency(it.price)}  = ${formatCurrency(it.qty * it.price)}`;
    const lines = doc.splitTextToSize(line, MAX_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5;
    if (y > 275) {
      doc.addPage();
      y = MARGIN;
    }
  }

  y += 3;
  doc.text(`Labour: ${formatCurrency(invoice.labour)}`, MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total: ${formatCurrency(invoice.total)}`, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Payment status: ${invoice.paid ? "Paid" : "Unpaid"}`, MARGIN, y);
  y += 5;
  doc.text(`Prepared by: ${invoice.staff}`, MARGIN, y);
  y += 5;
  if (options?.regeneratedAt) {
    doc.text(`PDF regenerated: ${options.regeneratedAt.toLocaleString()}`, MARGIN, y);
  }

  return doc.output("blob");
}

export function downloadInvoicePdf(blob: Blob, invoiceNumber: string) {
  const safeName = invoiceNumber.replace(/[^\w.-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
