import { AppShell } from "@/components/layout/app-shell";
import { DocumentManagerView } from "@/components/documents/document-manager";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  return (
    <AppShell
      breadcrumb={
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge variant="default" className="bg-primary/15 text-primary">
            Document Manager
          </Badge>
        </div>
      }
    >
      <DocumentManagerView />
    </AppShell>
  );
}
