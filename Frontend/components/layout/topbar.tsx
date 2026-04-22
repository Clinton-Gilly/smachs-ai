"use client";

import * as React from "react";
import Link from "next/link";
import { Home, PanelLeft, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetchHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Topbar({
  onToggleSidebar,
  sidebarOpen: _sidebarOpen,
  breadcrumb
}: {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  breadcrumb?: React.ReactNode;
}) {
  const [health, setHealth] = React.useState<"ok" | "down" | "loading">("loading");

  React.useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const tick = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        await fetchHealth(controller.signal);
        if (!cancelled) setHealth("ok");
      } catch {
        if (!cancelled) setHealth("down");
      }
    };

    tick();
    const id = window.setInterval(tick, 15000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border/50 bg-background/80 px-3 backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 text-muted-foreground/50">
          <Link href="/chat" className="rounded px-1.5 py-1 hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
          </Link>
          <span>/</span>
          <span className="text-sm font-medium text-foreground">{breadcrumb ?? "Chat"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Backend status indicator */}
        <div className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
          health === "ok"
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
            : health === "down"
              ? "bg-red-500/10 text-red-500 border border-red-500/20"
              : "bg-muted/60 text-muted-foreground border border-border/50"
        )}>
          {health === "ok" ? (
            <><Wifi className="h-3 w-3" /><span className="hidden sm:inline">Connected</span></>
          ) : health === "down" ? (
            <><WifiOff className="h-3 w-3" /><span className="hidden sm:inline">Offline</span></>
          ) : (
            <><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" /><span className="hidden sm:inline">Checking</span></>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
