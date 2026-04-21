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
  Brain,
  Check,
  ChevronsUpDown,
  FileText,
  Link2,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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

const MODE_COLOR: Record<string, string> = {
  rag: "bg-violet-500",
  coanony: "bg-amber-500",
  general: "bg-emerald-500"
};

const navItems: { href: string; label: string; icon: React.ElementType; disabled?: boolean }[] = [
  { href: "/chat", label: "Chat", icon: MessageSquarePlus },
  { href: "/documents", label: "Document Manager", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

export function Sidebar({ className, width }: { className?: string; width?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("id");

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
        "relative flex h-full shrink-0 flex-col bg-card/50 backdrop-blur border-r border-border/60 overflow-hidden",
        className
      )}
      style={{ width: width ?? 288 }}
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/40">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
          <Brain className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Smachs AI</span>
          <span className="text-[10px] text-muted-foreground">RAG Workspace</span>
        </div>
      </div>

      {/* New chat actions */}
      <div className="flex flex-col gap-1.5 px-3 pt-3 pb-2">
        <Button
          asChild
          variant="default"
          size="sm"
          className="justify-start gap-2 bg-primary hover:bg-primary/90 h-8 text-xs"
        >
          <Link href="/chat?new=general">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New General Chat
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm" className="justify-start gap-2 h-8 text-xs">
          <Link href="/chat?new=rag">
            <BookOpenText className="h-3.5 w-3.5" />
            New Knowledge Chat
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-3 pb-2">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              aria-disabled={item.disabled}
              className={cn(
                "group flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </span>
              {item.disabled && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/40" />

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground"
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
            placeholder="Search chats..."
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* History header */}
      <div className="flex items-center justify-between px-4 pb-1">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          {showArchived ? (
            <Archive className="h-3 w-3" />
          ) : null}
          {showArchived ? "Archived" : "Recent"}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{filtered.length}</span>
          {!showArchived && archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(true)}
              className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {archivedCount} archived
            </button>
          )}
        </div>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1 px-2 pb-3">
        <div className="flex flex-col gap-0.5">
          {filtered.map((h) => {
            const isActive = activeId === h.id;
            return (
              <div
                key={h.id}
                className={cn(
                  "group relative flex items-start rounded-lg px-2 py-2 transition-colors",
                  isActive ? "bg-accent/70 shadow-sm" : "hover:bg-accent/40"
                )}
              >
                {/* Mode indicator dot */}
                <div className="mt-1 mr-2 shrink-0">
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      MODE_COLOR[h.mode] ?? "bg-muted-foreground"
                    )}
                  />
                </div>

                <button
                  onClick={() => openChat(h.id)}
                  className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                >
                  {renamingId === h.id ? (
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(h.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(h.id);
                        if (e.key === "Escape") {
                          setRenamingId(null);
                          setRenameValue("");
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 px-1.5 text-xs"
                    />
                  ) : (
                    <span className="w-full text-xs font-medium leading-snug text-foreground line-clamp-2">
                      {h.title}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{formatDate(h.updatedAt)}</span>
                    <span className="opacity-40">·</span>
                    <span>{h.messages.length} msg{h.messages.length !== 1 ? "s" : ""}</span>
                    {h.mode !== "general" && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="capitalize">{h.mode === "rag" ? "RAG" : h.mode}</span>
                      </>
                    )}
                    {h.archived && (
                      <Badge variant="outline" className="h-3.5 px-1 text-[9px] py-0">
                        archived
                      </Badge>
                    )}
                  </div>
                  {h.scopedDocument && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 truncate w-full">
                      <FileText className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{h.scopedDocument.filename}</span>
                    </span>
                  )}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-foreground hover:bg-accent data-[state=open]:text-foreground data-[state=open]:bg-accent transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Chat actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onSelect={() => {
                        setRenamingId(h.id);
                        setRenameValue(h.title);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => shareChat(h.id)}>
                      {copiedId === h.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Link copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5" />
                          Share link
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => threadsStore.toggleArchive(h.id)}
                    >
                      {h.archived ? (
                        <>
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          Unarchive
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        threadsStore.remove(h.id);
                        if (activeId === h.id) router.replace("/chat");
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-[11px] text-muted-foreground">
              {showArchived
                ? "No archived chats"
                : query
                  ? `No chats match "${query}"`
                  : "No chats yet — start one above"}
            </div>
          )}

          {showArchived && (
            <button
              onClick={() => setShowArchived(false)}
              className="mt-1 w-full rounded-lg border border-dashed border-border/60 px-3 py-2 text-center text-[10px] text-muted-foreground hover:bg-accent/40 transition-colors"
            >
              ← Back to recent
            </button>
          )}
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-border/40 p-2">
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-accent transition-colors">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-rose-500 text-white text-xs">
              M
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-medium">Moses</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </div>
    </aside>
  );
}
