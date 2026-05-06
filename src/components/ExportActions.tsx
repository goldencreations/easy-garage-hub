import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import type React from "react";

export function ExportActions({ entity = "data" }: { entity?: string }) {
  const getScope = (button: HTMLButtonElement) =>
    (button.closest("[data-export-scope='true']") as HTMLElement | null) ?? button.parentElement;

  const extractTableData = (scope: HTMLElement | null) => {
    if (!scope) return null;
    const table = scope.querySelector("table");
    if (!table) return null;

    const headerCells = Array.from(table.querySelectorAll("thead th"));
    const headers = headerCells.map((cell) => (cell.textContent ?? "").trim());
    if (headers.length === 0) return null;

    const includedIndexes = headers
      .map((header, index) => ({ header: header.toLowerCase(), index }))
      .filter(({ header }) => header !== "actions" && header !== "")
      .map(({ index }) => index);

    const rows = Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => (cell.textContent ?? "").trim().replace(/\s+/g, " ")))
      .filter((cells) => cells.length > 0 && !/^no\s/i.test(cells[0] ?? ""))
      .map((cells) => includedIndexes.map((idx) => cells[idx] ?? ""));

    return {
      headers: includedIndexes.map((idx) => headers[idx] ?? ""),
      rows,
    };
  };

  const downloadFile = (content: BlobPart, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleExcel = (event: React.MouseEvent<HTMLButtonElement>) => {
    const tableData = extractTableData(getScope(event.currentTarget));
    if (!tableData) {
      toast.error("No table data found to export.");
      return;
    }

    const csv = [
      tableData.headers.join(","),
      ...tableData.rows.map((row) =>
        row
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    downloadFile(csv, `${entity}-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
    toast.success(`Exported ${entity} as Excel`);
  };

  const handlePdf = (event: React.MouseEvent<HTMLButtonElement>) => {
    const tableData = extractTableData(getScope(event.currentTarget));
    if (!tableData) {
      toast.error("No table data found to export.");
      return;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${entity.toUpperCase()} EXPORT`, 14, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    const headerLine = tableData.headers.join(" | ");
    const headerLines = doc.splitTextToSize(headerLine, 182);
    doc.text(headerLines, 14, y);
    y += headerLines.length * 5;
    doc.setFont("helvetica", "normal");

    for (const row of tableData.rows) {
      const rowLine = row.join(" | ");
      const wrapped = doc.splitTextToSize(rowLine, 182);
      if (y + wrapped.length * 5 > 285) {
        doc.addPage();
        y = 16;
      }
      doc.text(wrapped, 14, y);
      y += wrapped.length * 5 + 2;
    }

    doc.save(`${entity}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`Exported ${entity} as PDF`);
  };

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePdf}>
        <Download className="mr-2 h-4 w-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleExcel}>
        <Download className="mr-2 h-4 w-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="mr-2 h-4 w-4" /> Print
      </Button>
    </>
  );
}
