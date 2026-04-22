"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { threadsStore, useThreads } from "@/lib/threads";
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  BookOpenText,
  Check,
  FileText,
  Link2,
  LogOut,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {})
  });
}

const MODE_CONFIG: Record<string, { color: string; label: string }> = {
  rag: { color: "bg-violet-500", label: "RAG" },
  coanony: { color: "bg-amber-500", label: "Co" },
  general: { color: "bg-primary", label: "G" }
};

const BASE_NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquarePlus },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 }
];
const ADMIN_NAV = { href: "/admin", label: "Admin", icon: ShieldCheck };

export function Sidebar({ className, width }: { className?: string; width?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("id");
  const { user, signOut } = useAuth();

  const navItems = user?.role === "admin" ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV;

  const displayName = user?.displayName || user?.username || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const history = useThreads();
  const [query, setQuery] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);

  const visible = history.filter((h) =>
    showArchived ? !!h.archived : !h.archived
  );
  const filtered = visible.filter((h) =>
    h.title.toLowerCase().includes(query.toLowerCase())
  );
  const archivedCount = history.filter((h) => h.archived).length;

  const commitRename = (id: string) => {
    const title = renameValue.trim();
    if (title) threadsStore.rename(id, title);
    setRenamingId(null);
    setRenameValue("");
  };

  const openChat = (id: string) => router.push(`/chat?id=${id}`);

  const shareChat = (id: string) => {
    const url = `${window.location.origin}/chat?id=${encodeURIComponent(id)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col overflow-hidden",
        "bg-card/60 backdrop-blur-xl border-r border-border/50",
        className
      )}
      style={{ width: width ?? 280 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border/40">
        <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Zap className="h-4.5 w-4.5 fill-current" />
          <span className="absolute -inset-0.5 rounded-xl bg-primary/20 blur-sm -z-10" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">Smachs AI</span>
          <span className="text-[10px] text-muted-foreground font-medium">RAG Workspace</span>
        </div>
      </div>

      {/* New chat buttons */}
      <div className="flex flex-col gap-1.5 px-3 pt-4 pb-2">
        <Button
          asChild
          size="sm"
          className="justify-start gap-2 h-8 text-xs font-medium bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
        >
          <Link href="/chat?new=general">
            <Sparkles className="h-3.5 w-3.5" />
            New Chat
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="justify-start gap-2 h-8 text-xs border-border/60 hover:border-primary/40 hover:bg-accent/60">
          <Link href="/chat?new=rag">
            <BookOpenText className="h-3.5 w-3.5" />
            Knowledge Chat
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-2 pb-3 pt-1">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all",
                active
                  ? "bg-primary/10 text-primary border-l-2 border-primary pl-[9px]"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border-l-2 border-transparent pl-[9px]"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 border-t border-border/40" />

      {/* Search */}
      <div className="px-3 pt-3 pb-1.5">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-[7px] h-3.5 w-3.5 text-muted-foreground/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="h-7 pl-8 text-xs bg-muted/60 border-border/50 focus:border-primary/40"
          />
        </div>
      </div>

      {/* History header */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          {showArchived && <Archive className="h-3 w-3" />}
          {showArchived ? "Archived" : "Recent"}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/60">{filtered.length}</span>
          {!showArchived && archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(true)}
              className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {archivedCount} archived
            </button>
          )}
        </div>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="flex flex-col gap-0.5">
          {filtered.map((h) => {
            const isActive = activeId === h.id;
            const modeConf = MODE_CONFIG[h.mode] ?? MODE_CONFIG.general;
            return (
              <div
                key={h.id}
                className={cn(
                  "group flex w-full min-w-0 items-center gap-1.5 rounded-lg px-2 py-2 transition-all",
                  isActive
                    ? "bg-primary/10 border border-primary/20 shadow-sm"
                    : "hover:bg-accent/50 border border-transparent"
                )}
              >
                {/* Mode dot */}
                <div className="shrink-0">
                  <div className={cn("h-1.5 w-1.5 rounded-full", modeConf.color)} />
                </div>

                {/* Title + meta — min-w-0 + overflow-hidden ensure truncation works */}
                <button
                  onClick={() => openChat(h.id)}
                  className="min-w-0 flex-1 overflow-hidden text-left"
                >
                  {renamingId === h.id ? (
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(h.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(h.id);
                        if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 px-1.5 text-xs w-full"
                    />
                  ) : (
                    <p className={cn(
                      "truncate text-xs font-medium leading-snug",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {h.title}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-0.5 overflow-hidden">
                    <span className="shrink-0">{formatDate(h.updatedAt)}</span>
                    <span className="opacity-40">·</span>
                    <span className="shrink-0">{h.messages.length}msg</span>
                    {h.archived && (
                      <Badge variant="outline" className="h-3.5 shrink-0 px-1 text-[9px] py-0">
                        archived
                      </Badge>
                    )}
                  </div>
                  {h.scopedDocument && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-0.5 overflow-hidden">
                      <FileText className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{h.scopedDocument.filename}</span>
                    </div>
                  )}
                </button>

                {/* Always-visible 3-dot menu — shrink-0 so it NEVER gets squeezed out */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-foreground hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => { setRenamingId(h.id); setRenameValue(h.title); }}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => shareChat(h.id)}>
                      {copiedId === h.id ? (
                        <><Check className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-500">Link copied!</span></>
                      ) : (
                        <><Link2 className="h-3.5 w-3.5" /><span>Share link</span></>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => threadsStore.toggleArchive(h.id)}>
                      {h.archived
                        ? <><ArchiveRestore className="h-3.5 w-3.5" /><span>Unarchive</span></>
                        : <><Archive className="h-3.5 w-3.5" /><span>Archive</span></>
                      }
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => { threadsStore.remove(h.id); if (activeId === h.id) router.replace("/chat"); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete chat</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/50 px-3 py-8 text-center">
              <MessageSquarePlus className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-[11px] text-muted-foreground/60">
                {showArchived
                  ? "No archived chats"
                  : query
                    ? `No results for "${query}"`
                    : "Start a new conversation above"}
              </p>
            </div>
          )}

          {showArchived && (
            <button
              onClick={() => setShowArchived(false)}
              className="mt-1 w-full rounded-lg border border-dashed border-border/50 px-3 py-2 text-center text-[10px] text-muted-foreground hover:bg-accent/40 transition-colors"
            >
              ← Back to recent
            </button>
          )}
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-border/40 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-xs font-semibold">{displayName}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {user?.role === "admin" ? (
                    <><ShieldCheck className="h-2.5 w-2.5 text-primary" />Admin</>
                  ) : (
                    <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</>
                  )}
                </span>
              </div>
              <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-1">
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold truncate">{displayName}</p>
              {user?.email && <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive gap-2">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
