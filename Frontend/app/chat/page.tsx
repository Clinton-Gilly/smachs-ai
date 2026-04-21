import { AppShell } from "@/components/layout/app-shell";
import { ChatView } from "@/components/chat/chat-view";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <AppShell
      breadcrumb={
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-primary/15 text-primary">
            Chat
          </Badge>
        </div>
      }
    >
      <ChatView />
    </AppShell>
  );
}
