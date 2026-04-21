"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 288;

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
  const dragging = React.useRef(false);
  const startX = React.useRef(0);
  const startWidth = React.useRef(DEFAULT_WIDTH);

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
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
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
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
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
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — inline on desktop, fixed overlay on mobile */}
      <div
        className={cn(
          "h-full shrink-0 transition-[opacity] duration-200 ease-out",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50",
          open
            ? "opacity-100 max-md:shadow-xl"
            : "opacity-0 pointer-events-none"
        )}
        style={{
          width: open ? (isMobile ? DEFAULT_WIDTH : sidebarWidth) : 0,
          transition: open ? "opacity 200ms ease-out" : "opacity 200ms ease-out, width 200ms ease-out"
        }}
      >
        <Sidebar width={isMobile ? DEFAULT_WIDTH : sidebarWidth} />

        {/* Resize handle — desktop only */}
        {!isMobile && open && (
          <div
            onMouseDown={onDragStart}
            className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize group/handle flex items-center justify-center"
            title="Drag to resize"
          >
            <div className="h-12 w-0.5 rounded-full bg-border opacity-0 group-hover/handle:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Topbar
          onToggleSidebar={toggle}
          sidebarOpen={open}
          breadcrumb={breadcrumb}
        />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
