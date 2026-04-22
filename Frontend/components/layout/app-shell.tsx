"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const MIN_WIDTH = 200;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 280;
const STORAGE_KEY = "smachs-sidebar-width";

export function AppShell({
  children,
  breadcrumb
}: {
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragging = React.useRef(false);
  const startX = React.useRef(0);
  const startWidth = React.useRef(DEFAULT_WIDTH);

  // Restore saved width on mount
  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) setSidebarWidth(n);
    }
  }, []);

  React.useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setSidebarWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Persist width
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) localStorage.setItem(STORAGE_KEY, saved);
      setSidebarWidth((w) => {
        localStorage.setItem(STORAGE_KEY, String(w));
        return w;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background gradient-mesh">
      {/* Mobile backdrop */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "relative h-full shrink-0",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50",
          open ? "opacity-100 max-md:shadow-2xl" : "opacity-0 pointer-events-none"
        )}
        style={{
          width: open ? (isMobile ? DEFAULT_WIDTH : sidebarWidth) : 0,
          transition: isDragging
            ? "none"
            : open
              ? "opacity 200ms ease-out"
              : "opacity 200ms ease-out, width 220ms ease-out"
        }}
      >
        <Sidebar width={isMobile ? DEFAULT_WIDTH : sidebarWidth} />

        {/* Resize handle — desktop only */}
        {!isMobile && open && (
          <div
            onMouseDown={onDragStart}
            className={cn(
              "group/handle absolute inset-y-0 right-0 z-20 flex w-3 cursor-col-resize items-center justify-center",
            )}
            title="Drag to resize sidebar"
          >
            {/* Visual grip */}
            <div className={cn(
              "flex h-10 w-1 flex-col items-center justify-center gap-1 rounded-full transition-all duration-150",
              isDragging
                ? "bg-primary w-1 opacity-100"
                : "bg-border opacity-0 group-hover/handle:opacity-100 group-hover/handle:bg-primary/60"
            )}>
              {/* Grip dots */}
              <span className="h-1 w-1 rounded-full bg-current opacity-60" />
              <span className="h-1 w-1 rounded-full bg-current opacity-60" />
              <span className="h-1 w-1 rounded-full bg-current opacity-60" />
            </div>
          </div>
        )}
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={toggle} sidebarOpen={open} breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
