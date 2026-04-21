"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpenText,
  FileType2,
  Layers,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { threadsStore } from "@/lib/threads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DocCollection,
  addToCollection,
  createCollection,
  deleteCollection,
  listCollections,
  removeFromCollection,
  updateCollection
} from "@/lib/collections";
import {
  DocumentRow,
  formatBytes,
  listDocuments,
  uploadDocument
} from "@/lib/documents";

const ACCEPTED_TYPES = ".pdf,.docx,.txt,.md";

type Toast = { id: string; kind: "success" | "error" | "info"; text: string };

function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...t }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((x) => x.id !== id)),
      4000
    );
  }, []);
  return { toasts, push };
}

export function KnowledgeView({
  triggerCreate,
  onCountChange
}: {
  triggerCreate?: number;
  onCountChange?: (n: number) => void;
} = {}) {
  const router = useRouter();
  const [collections, setCollections] = React.useState<DocCollection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  const { toasts, push } = useToasts();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCollections();
      setCollections(rows);
    } catch (err) {
      setError((err as Error).message || "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Open create form when parent triggers it
  React.useEffect(() => {
    if (triggerCreate) setCreating(true);
  }, [triggerCreate]);

  // Report count to parent
  React.useEffect(() => {
    if (onCountChange) onCountChange(collections.length);
  }, [collections.length, onCountChange]);

  const filtered = collections.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const create = async (files: File[]) => {
    const name = newName.trim();
    if (!name) return;
    try {
      const c = await createCollection({
        name,
        description: newDesc.trim() || undefined
      });

      if (files.length > 0) {
        const uploadedIds: string[] = [];
        for (const file of files) {
          try {
            const r = await uploadDocument(file, {});
            uploadedIds.push(r.documentId);
          } catch {
            // skip failed files, continue with others
          }
        }
        if (uploadedIds.length > 0) {
          await addToCollection(c.collectionId, uploadedIds);
        }
      }

      setNewName("");
      setNewDesc("");
      setCreating(false);
      setCollections((prev) => [c, ...prev]);
      setActiveId(c.collectionId);
      push({
        kind: "success",
        text: files.length > 0
          ? `Collection created with ${files.length} document${files.length === 1 ? "" : "s"}.`
          : "Collection created"
      });
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    }
  };

  const removeCollection = async (c: DocCollection) => {
    if (!confirm(`Delete "${c.name}"? This only removes the grouping — the documents stay.`))
      return;
    try {
      await deleteCollection(c.collectionId);
      setCollections((prev) =>
        prev.filter((x) => x.collectionId !== c.collectionId)
      );
      if (activeId === c.collectionId) setActiveId(null);
      push({ kind: "success", text: "Collection deleted" });
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    }
  };

  const rename = async (c: DocCollection) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === c.name) return;
    try {
      const updated = await updateCollection(c.collectionId, { name });
      setCollections((prev) =>
        prev.map((x) => (x.collectionId === c.collectionId ? updated : x))
      );
      push({ kind: "success", text: "Renamed" });
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    }
  };

  const startChat = (c: DocCollection) => {
    const thread = threadsStore.create("rag", {
      title: `Chat: ${c.name}`,
      scopedCollection: {
        collectionId: c.collectionId,
        name: c.name,
        documentCount: c.documentIds.length
      }
    });
    router.push(`/chat?id=${encodeURIComponent(thread.id)}`);
  };

  const active = collections.find((c) => c.collectionId === activeId) ?? null;

  return (
    <div className="flex h-full flex-col">
      {!onCountChange && (
        <header className="border-b border-border bg-background/60 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="text-lg font-semibold tracking-tight">
                Knowledge Bases
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Group documents into reusable knowledge bases and chat scoped to
                them.
              </p>
            </div>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        </header>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search knowledge bases..."
                className="pl-9"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {loading ? "Loading..." : `${filtered.length} of ${collections.length}`}
            </span>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">Can't reach the backend.</div>
                <div className="text-xs opacity-90">{error}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={load}>
                Retry
              </Button>
            </div>
          )}

          {loading && collections.length === 0 ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={() => setCreating(true)} hasQuery={!!query} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <Card
                  key={c.collectionId}
                  className={cn(
                    "group flex h-full cursor-pointer flex-col gap-3 border-border/70 bg-card/60 p-4 transition-all",
                    "hover:border-primary/40 hover:bg-card/80 hover:shadow-md"
                  )}
                  onClick={() => setActiveId(c.collectionId)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <BookOpenText className="h-4 w-4" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        {renamingId === c.collectionId ? (
                          <Input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => rename(c)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") rename(c);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            className="h-7 text-sm"
                          />
                        ) : (
                          <span className="line-clamp-1 text-sm font-medium">
                            {c.name}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {c.documentIds.length} documents
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Chat"
                        className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          startChat(c);
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Rename"
                        className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(c.collectionId);
                          setRenameValue(c.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCollection(c);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {c.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {c.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Badge variant="subtle" className="gap-1">
                      <Layers className="h-3 w-3" />
                      {c.documentIds.length}
                    </Badge>
                    <span className="ml-auto">
                      Updated {formatDate(c.updatedAt)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {creating && (
        <CreateDialog
          name={newName}
          desc={newDesc}
          onName={setNewName}
          onDesc={setNewDesc}
          onCancel={() => setCreating(false)}
          onCreate={(files) => create(files)}
        />
      )}

      {active && (
        <ManageDrawer
          collection={active}
          onClose={() => setActiveId(null)}
          onChanged={load}
          onChat={() => startChat(active)}
          push={push}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}

function CreateDialog({
  name,
  desc,
  onName,
  onDesc,
  onCancel,
  onCreate
}: {
  name: string;
  desc: string;
  onName: (v: string) => void;
  onDesc: (v: string) => void;
  onCancel: () => void;
  onCreate: (files: File[]) => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(files);
    } finally {
      setBusy(false);
    }
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onCancel}
    >
      <Card
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden border-border/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">New knowledge base</h2>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={busy}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => onName(e.target.value)}
                placeholder="e.g. HR Policies"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) submit();
                }}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Description (optional)
              </label>
              <Textarea
                value={desc}
                onChange={(e) => onDesc(e.target.value)}
                placeholder="What lives in this knowledge base?"
                className="min-h-[70px]"
                disabled={busy}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Upload documents (optional)
              </label>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const list = Array.from(e.dataTransfer.files ?? []);
                  if (list.length) setFiles((prev) => [...prev, ...list]);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
                  dragOver
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-accent/30"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  disabled={busy}
                  onChange={(e) =>
                    setFiles((prev) => [
                      ...prev,
                      ...Array.from(e.target.files ?? [])
                    ])
                  }
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="mt-1.5 text-sm font-medium">
                  Drop files or click to browse
                </span>
                <span className="text-[11px] text-muted-foreground">
                  PDF · DOCX · TXT · MD
                </span>
              </label>

              {files.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {files.map((f, i) => (
                    <div
                      key={`${i}-${f.name}`}
                      className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5 text-xs"
                    >
                      <FileType2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatBytes(f.size)}
                      </span>
                      {!busy && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => removeFile(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Creating..." : "Create"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ManageDrawer({
  collection,
  onClose,
  onChanged,
  onChat,
  push
}: {
  collection: DocCollection;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onChat: () => void;
  push: (t: Omit<Toast, "id">) => void;
}) {
  const [docs, setDocs] = React.useState<DocumentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [deferredSearch, setDeferredSearch] = React.useState("");
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set());
  const [memberIds, setMemberIds] = React.useState<Set<string>>(
    new Set(collection.documentIds)
  );

  React.useEffect(() => {
    setMemberIds(new Set(collection.documentIds));
  }, [collection.documentIds]);

  React.useEffect(() => {
    const h = window.setTimeout(() => setDeferredSearch(search), 250);
    return () => window.clearTimeout(h);
  }, [search]);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    listDocuments(
      { limit: 100, offset: 0, search: deferredSearch },
      ctrl.signal
    )
      .then((res) => setDocs(res.documents))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [deferredSearch]);

  const toggle = async (doc: DocumentRow) => {
    if (pendingIds.has(doc.documentId)) return;
    setPendingIds((prev) => new Set(prev).add(doc.documentId));
    const isMember = memberIds.has(doc.documentId);
    try {
      if (isMember) {
        await removeFromCollection(collection.collectionId, doc.documentId);
        setMemberIds((prev) => {
          const next = new Set(prev);
          next.delete(doc.documentId);
          return next;
        });
      } else {
        await addToCollection(collection.collectionId, [doc.documentId]);
        setMemberIds((prev) => new Set(prev).add(doc.documentId));
      }
      await onChanged();
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.documentId);
        return next;
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col border-l border-border bg-card shadow-xl sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-col">
            <h2 className="line-clamp-1 text-sm font-semibold">
              {collection.name}
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {memberIds.size} documents
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" className="gap-2" onClick={onChat}>
              <MessageSquare className="h-4 w-4" />
              Chat
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents to add..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-md border border-border bg-card/40"
                />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No documents match.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {docs.map((d) => {
                const isMember = memberIds.has(d.documentId);
                const pending = pendingIds.has(d.documentId);
                return (
                  <label
                    key={d.documentId}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-xs hover:bg-accent/40",
                      isMember && "border-primary/40 bg-primary/5",
                      pending && "opacity-60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isMember}
                      disabled={pending}
                      onChange={() => toggle(d)}
                    />
                    <span className="line-clamp-1 flex-1">{d.filename}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {d.chunks} chunks
                    </span>
                    {pending && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-xl border border-border bg-card/40"
        />
      ))}
    </div>
  );
}

function EmptyState({
  onCreate,
  hasQuery
}: {
  onCreate: () => void;
  hasQuery: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <BookOpenText className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold">
        {hasQuery ? "No matches" : "No knowledge bases yet"}
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {hasQuery
          ? "Try a different search term."
          : "Group related documents and chat scoped to the group. Retrieval stays within the base."}
      </p>
      {!hasQuery && (
        <Button className="mt-4 gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Create your first knowledge base
        </Button>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" })
  });
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-lg backdrop-blur",
            t.kind === "success" &&
              "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
            t.kind === "error" &&
              "border-destructive/40 bg-destructive/15 text-destructive",
            t.kind === "info" && "border-border bg-card/90 text-foreground"
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
