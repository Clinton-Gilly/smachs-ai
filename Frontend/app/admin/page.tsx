import { AppShell } from "@/components/layout/app-shell";
import { AdminView } from "@/components/admin/admin-view";
import { AdminErrorBoundary } from "@/components/admin/error-boundary";
import { AdminGuard } from "@/components/admin/admin-guard";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <AppShell
      breadcrumb={
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge variant="default" className="bg-primary/15 text-primary">
            Admin
          </Badge>
        </div>
      }
    >
      <AdminGuard>
        <AdminErrorBoundary>
          <AdminView />
        </AdminErrorBoundary>
      </AdminGuard>
    </AppShell>
  );
}
