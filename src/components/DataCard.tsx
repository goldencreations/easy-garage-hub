import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

type Props = {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function DataCard({ title, actions, children }: Props) {
  return (
    <Card className="overflow-hidden border bg-card shadow-sm" data-export-scope="true">
      {(title || actions) && (
        <div className="flex flex-col gap-3 border-b bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}
