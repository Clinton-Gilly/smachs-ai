"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Home, MoreHorizontal, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetchHealth } from "@/lib/api";

export function Topbar({
  onToggleSidebar,
  sidebarOpen: _sidebarOpen,
  breadcrumb
}: {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  breadcrumb?: React.ReactNode;
}) {
  const [health, setHealth] = React.useState<"ok" | "down" | "loading">(
    "loading"
  );

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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Link
          href="/chat"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
        <span className="text-muted-foreground">/</span>
        <div className="text-sm font-medium">{breadcrumb ?? "Chat"}</div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Badge
          variant={
            health === "ok"
              ? "success"
              : health === "down"
                ? "destructive"
                : "subtle"
          }
          className="gap-1.5"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              health === "ok"
                ? "bg-emerald-500 animate-pulse-dot"
                : health === "down"
                  ? "bg-red-500"
                  : "bg-muted-foreground"
            }`}
          />
          <span className="hidden sm:inline">
            {health === "ok" ? "Live" : health === "down" ? "Offline" : "Checking"}
          </span>
        </Badge>

        <Button variant="ghost" size="icon" aria-label="Notifications" className="hidden sm:flex">
          <Bell className="h-4 w-4" />
        </Button>

        <ThemeToggle />

        <Button variant="ghost" size="icon" aria-label="More" className="hidden sm:flex">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
