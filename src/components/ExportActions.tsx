import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

export function ExportActions({ entity = "data" }: { entity?: string }) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => toast.success(`Exported ${entity} as PDF`)}>
        <Download className="mr-2 h-4 w-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => toast.success(`Exported ${entity} as Excel`)}>
        <Download className="mr-2 h-4 w-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => toast.success("Print dialog opened")}>
        <Printer className="mr-2 h-4 w-4" /> Print
      </Button>
    </>
  );
}
