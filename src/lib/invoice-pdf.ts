import { jsPDF } from "jspdf";
import type { Invoice, Customer, Car } from "./mock-data";
const GARAGE_NAME = "AZIZI AUTOMOTIVE GARAGE";
const GARAGE_PHONE = "+255677401259";
const GARAGE_EMAIL = "aziziautomotivegarage1@gmail.com";
const GARAGE_LOCATION = "Kijitonyama, Dar es Salaam, Tanzania";
const GARAGE_TIN = "127-702-112";
const PAYMENT_ACCOUNT = "A/C NO: 24710015587 - NMB";
const PAYMENT_ACCOUNT_NAME = "A/C NAME: AZIZI AUTOMOTIVE GARAGE";

let logoDataUrlPromise: Promise<string | null> | null = null;
const formatTzs = (value: number) => new Intl.NumberFormat("en-US").format(Math.max(0, Number(value) || 0));
const formatInvoiceDateLong = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const loadLogoDataUrl = async () => {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch("/aziziumemelogo.png")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load logo");
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Failed to read logo"));
            reader.readAsDataURL(blob);
          }),
      )
      .catch(() => null);
  }
  return logoDataUrlPromise;
};

export async function buildInvoicePdf(
  invoice: Invoice,
  customer: Customer,
  car: Car | undefined,
  options?: { regeneratedAt?: Date },
): Promise<Blob> {
  const logoDataUrl = await loadLogoDataUrl();
  const amountPaid = invoice.paid ? Number(invoice.total) || 0 : 0;
  const balanceDue = Math.max(0, (Number(invoice.total) || 0) - amountPaid);
  const printedAt = options?.regeneratedAt ?? new Date();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 12;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 14, y, 48, 18);
    } catch {
      // keep generating if logo cannot be rendered
    }
  }

  doc.setTextColor(214, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("INVOICE", 196, y + 8, { align: "right" });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice REF: ${invoice.number}`, 196, y + 14, { align: "right" });
  doc.text(`Date: ${formatInvoiceDateLong(invoice.date)}`, 196, y + 20, { align: "right" });

  y = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INVOICE TO:", 14, y);
  doc.text("INVOICE FROM:", 108, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const leftLines = [
    customer.name,
    `Car Reg: ${car?.plate ?? "—"}`,
    `Car Name: ${car ? `${car.make} ${car.model}` : "—"} (${car?.color ?? "—"})`,
    customer.phone,
    "DAR ES SALAAM",
  ];
  leftLines.forEach((line, idx) => doc.text(line, 14, y + 6 + idx * 5));

  const rightLines = [
    GARAGE_NAME,
    GARAGE_PHONE,
    GARAGE_EMAIL,
    GARAGE_LOCATION,
    `TIN: ${GARAGE_TIN}`,
    `Printed: ${formatInvoiceDateLong(printedAt)}, ${printedAt.toLocaleTimeString()}`,
    `By: ${invoice.staff || "System User"}`,
  ];
  rightLines.forEach((line, idx) => doc.text(line, 108, y + 6 + idx * 5));
  y += 44;

  doc.setFont("helvetica", "bold");
  doc.setFillColor(214, 0, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(14, y, 182, 8, "F");
  doc.text("#", 20, y + 5.5);
  doc.text("Item", 32, y + 5.5);
  doc.text("Qty", 132, y + 5.5, { align: "right" });
  doc.text("Price (TZS)", 162, y + 5.5, { align: "right" });
  doc.text("Total (TZS)", 193, y + 5.5, { align: "right" });
  y += 10;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const [index, it] of invoice.items.entries()) {
    const lines = doc.splitTextToSize(it.description, 96);
    const rowHeight = Math.max(6, lines.length * 5);
    doc.text(String(index + 1), 20, y + 4);
    doc.text(lines, 32, y + 4);
    doc.text(String(it.qty), 132, y + 4, { align: "right" });
    doc.text(formatTzs(it.price), 162, y + 4, { align: "right" });
    doc.text(formatTzs(it.qty * it.price), 193, y + 4, { align: "right" });
    y += rowHeight;
    doc.setDrawColor(235, 235, 235);
    doc.line(14, y, 196, y);
    y += 2;
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
  }

  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.text("PAYMENT DETAILS:", 14, y + 4);
  doc.text(PAYMENT_ACCOUNT, 14, y + 9);
  doc.text(PAYMENT_ACCOUNT_NAME, 14, y + 14);
  doc.text("TERMS & CONDITIONS", 14, y + 20);
  const terms = [
    "Extra repairs not listed in the quote will be charged separately.",
    "Please collect removed parts within 7 days of repair.",
    "80% of the payment is due upfront, remaining on completion.",
    "Storage fees may apply for pickups made after 7 days.",
  ];
  terms.forEach((term, idx) => doc.text(`- ${term}`, 14, y + 25 + idx * 4.6));

  const boxX = 130;
  const boxY = y + 2;
  const boxW = 66;
  const rowH = 7;
  doc.setDrawColor(0, 0, 0);
  doc.rect(boxX, boxY, boxW, rowH * 4 + 2);
  const summaryRows = [
    ["Subtotal", formatTzs(invoice.total)],
    ["Total Amount", `${formatTzs(invoice.total)} TZS`],
    ["Amount Paid", formatTzs(amountPaid)],
    ["Balance Due", formatTzs(balanceDue)],
  ] as const;
  summaryRows.forEach(([label, value], idx) => {
    const lineY = boxY + 6 + idx * rowH;
    if (idx > 0) doc.line(boxX, boxY + 2 + idx * rowH, boxX + boxW, boxY + 2 + idx * rowH);
    doc.text(label, boxX + 2, lineY);
    doc.text(value, boxX + boxW - 2, lineY, { align: "right" });
  });

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
