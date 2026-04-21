import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <AppShell
      breadcrumb={
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-primary/15 text-primary">
            Analytics
          </Badge>
        </div>
      }
    >
      <AnalyticsView />
    </AppShell>
  );
}
