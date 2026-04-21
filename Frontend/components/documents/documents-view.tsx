"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Download,
  FileText,
  FileType2,
  Filter,
  Hash,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
  ClipboardPaste,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { threadsStore } from "@/lib/threads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DocumentRow,
  DocumentDetail,
  DocumentFacets,
  DocumentStats,
  ListDocumentsParams,
  deleteDocument,
  exportDocument,
  formatBytes,
  getDocument,
  getDocumentFacets,
  getDocumentStats,
  ingestUrl,
  listDocuments,
  niceFileType,
  reindexDocument,
  updateDocument,
  uploadDocument,
  uploadText
} from "@/lib/documents";
import {
  DocCollection,
  addToCollection,
  createCollection,
  deleteCollection,
  listCollections,
  removeFromCollection
} from "@/lib/collections";

const ACCEPTED_TYPES = ".pdf,.docx,.txt,.md";
const PAGE_SIZE = 24;

type Toast = { id: string; kind: "success" | "error" | "info"; text: string };

function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...t }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);
  return { toasts, push };
}

export function DocumentsView({
  externalSearch,
  externalTypeFilter,
  triggerUpload,
  onCountChange
}: {
  externalSearch?: string;
  externalTypeFilter?: string;
  triggerUpload?: number;
  onCountChange?: (n: number) => void;
} = {}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<DocumentRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [stats, setStats] = React.useState<DocumentStats | null>(null);
  const [facets, setFacets] = React.useState<DocumentFacets>({
    categories: [],
    authors: [],
    tags: []
  });
  const [collections, setCollections] = React.useState<DocCollection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [deferredSearch, setDeferredSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [collectionId, setCollectionId] = React.useState("");
  const [page, setPage] = React.useState(0);

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [collectionsOpen, setCollectionsOpen] = React.useState(false);

  const { toasts, push } = useToasts();

  // Sync external search from parent
  React.useEffect(() => {
    if (externalSearch !== undefined) setSearch(externalSearch);
  }, [externalSearch]);

  // Open upload modal when parent triggers it
  React.useEffect(() => {
    if (triggerUpload) setUploadOpen(true);
  }, [triggerUpload]);

  // Report count to parent
  React.useEffect(() => {
    if (onCountChange && stats?.totalDocuments != null) {
      onCountChange(stats.totalDocuments);
    }
  }, [stats?.totalDocuments, onCountChange]);

  const startScopedChat = React.useCallback(
    (scope:
      | { kind: "document"; doc: Pick<DocumentRow, "documentId" | "filename" | "totalPages"> }
      | { kind: "collection"; col: DocCollection }) => {
      if (scope.kind === "document") {
        const thread = threadsStore.create("rag", {
          title: `Chat: ${scope.doc.filename}`,
          scopedDocument: {
            documentId: scope.doc.documentId,
            filename: scope.doc.filename,
            totalPages: scope.doc.totalPages ?? null
          }
        });
        router.push(`/chat?id=${encodeURIComponent(thread.id)}`);
      } else {
        const thread = threadsStore.create("rag", {
          title: `Chat: ${scope.col.name}`,
          scopedCollection: {
            collectionId: scope.col.collectionId,
            name: scope.col.name,
            documentCount: scope.col.documentIds.length
          }
        });
        router.push(`/chat?id=${encodeURIComponent(thread.id)}`);
      }
    },
    [router]
  );

  const refresh = React.useCallback(
    async (opts: {
      q?: string;
      page?: number;
      category?: string;
      author?: string;
      tag?: string;
      collectionId?: string;
    } = {}) => {
      try {
        setLoading(true);
        setError(null);
        const p = opts.page ?? page;
        const params: ListDocumentsParams = {
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
          search: opts.q ?? deferredSearch,
          category: opts.category ?? category,
          author: opts.author ?? author,
          tag: opts.tag ?? tag,
          collectionId: opts.collectionId ?? collectionId
        };
        const [list, s, f, cols] = await Promise.all([
          listDocuments(params),
          getDocumentStats().catch(() => null),
          getDocumentFacets().catch(() => null),
          listCollections().catch(() => [] as DocCollection[])
        ]);
        setRows(list.documents);
        setTotal(list.total);
        if (s) setStats(s);
        if (f) setFacets(f);
        setCollections(cols);
      } catch (err) {
        setError((err as Error).message || "Failed to load documents");
      } finally {
        setLoading(false);
      }
    },
    [page, deferredSearch, category, author, tag, collectionId]
  );

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    const h = window.setTimeout(() => {
      setDeferredSearch(search);
      setPage(0);
    }, 250);
    return () => window.clearTimeout(h);
  }, [search]);

  const onUploaded = (msg: string) => {
    push({ kind: "success", text: msg });
    setUploadOpen(false);
    refresh({ page: 0 });
    setPage(0);
  };
  const onUploadError = (msg: string) =>
    push({ kind: "error", text: msg });

  const doDelete = async (id: string) => {
    try {
      setDeleting(true);
      await deleteDocument(id);
      push({ kind: "success", text: "Document deleted" });
      setConfirmId(null);
      if (previewId === id) setPreviewId(null);
      refresh();
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setCategory("");
    setAuthor("");
    setTag("");
    setCollectionId("");
    setPage(0);
  };

  const hasFilters =
    Boolean(category || author || tag || collectionId || deferredSearch);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex h-full flex-col">
      {!onCountChange && (
        <header className="border-b border-border bg-background/60 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="text-lg font-semibold tracking-tight">Documents</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Source library used for retrieval. Upload files, paste text, or
                ingest URLs.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => setCollectionsOpen(true)}
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Collections</span>
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => setUploadOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6 sm:pb-5">
            <StatsStrip stats={stats} totalInView={total} />
          </div>
        </header>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by filename, tag, author..."
                  className="pl-9"
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {loading
                  ? "Loading..."
                  : `${rows.length ? page * PAGE_SIZE + 1 : 0}–${
                      page * PAGE_SIZE + rows.length
                    } of ${total}`}
              </span>
            </div>
            <FilterBar
              facets={facets}
              collections={collections}
              category={category}
              author={author}
              tag={tag}
              collectionId={collectionId}
              onChange={(next) => {
                if (next.category !== undefined) setCategory(next.category);
                if (next.author !== undefined) setAuthor(next.author);
                if (next.tag !== undefined) setTag(next.tag);
                if (next.collectionId !== undefined)
                  setCollectionId(next.collectionId);
                setPage(0);
              }}
              onReset={hasFilters ? resetFilters : undefined}
            />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">Can't reach the backend.</div>
                <div className="text-xs opacity-90">{error}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => refresh()}>
                Retry
              </Button>
            </div>
          )}

          {loading && rows.length === 0 ? (
            <SkeletonGrid />
          ) : rows.length === 0 ? (
            <EmptyState onUpload={() => setUploadOpen(true)} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                  <DocCard
                    key={row.documentId}
                    row={row}
                    onPreview={() => setPreviewId(row.documentId)}
                    onDelete={() => setConfirmId(row.documentId)}
                    onChat={() =>
                      startScopedChat({ kind: "document", doc: row })
                    }
                  />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(p) => {
                  setPage(p);
                  refresh({ page: p });
                }}
              />
            </>
          )}
        </div>
      </div>

      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onUploaded={onUploaded}
          onError={onUploadError}
        />
      )}

      {previewId && (
        <PreviewDrawer
          documentId={previewId}
          onClose={() => setPreviewId(null)}
          onDelete={() => setConfirmId(previewId)}
          onChat={(doc) => startScopedChat({ kind: "document", doc })}
          onChanged={() => refresh()}
          push={push}
        />
      )}

      {confirmId && (
        <ConfirmDelete
          docName={
            rows.find((r) => r.documentId === confirmId)?.filename ??
            "this document"
          }
          busy={deleting}
          onCancel={() => setConfirmId(null)}
          onConfirm={() => doDelete(confirmId)}
        />
      )}

      {collectionsOpen && (
        <CollectionsDialog
          collections={collections}
          documents={rows}
          onClose={() => setCollectionsOpen(false)}
          onChanged={async () => {
            const next = await listCollections().catch(() => []);
            setCollections(next);
          }}
          onOpenChat={(col) =>
            startScopedChat({ kind: "collection", col })
          }
          push={push}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}

function StatsStrip({
  stats,
  totalInView
}: {
  stats: DocumentStats | null;
  totalInView: number;
}) {
  const items = [
    {
      label: "Documents",
      value: String(stats?.totalDocuments ?? totalInView ?? "—"),
      icon: <FileText className="h-4 w-4" />
    },
    {
      label: "Chunks",
      value: String(stats?.totalChunks ?? "—"),
      icon: <Layers className="h-4 w-4" />
    },
    {
      label: "Est. tokens",
      value:
        stats?.estimatedTokens != null
          ? stats.estimatedTokens.toLocaleString()
          : "—",
      icon: <Hash className="h-4 w-4" />
    },
    {
      label: "Embed model",
      value: stats?.embeddingModels?.[0] ?? "—",
      icon: <RefreshCw className="h-4 w-4" />
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
      {items.map((it) => (
        <Card
          key={it.label}
          className="flex items-center gap-3 border-border/70 bg-card/60 p-4"
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
            {it.icon}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {it.label}
            </span>
            <span className="line-clamp-1 text-base font-semibold tracking-tight">
              {it.value}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function FilterBar({
  facets,
  collections,
  category,
  author,
  tag,
  collectionId,
  onChange,
  onReset
}: {
  facets: DocumentFacets;
  collections: DocCollection[];
  category: string;
  author: string;
  tag: string;
  collectionId: string;
  onChange: (next: {
    category?: string;
    author?: string;
    tag?: string;
    collectionId?: string;
  }) => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span>Filter:</span>
      </div>
      <FacetSelect
        label="Collection"
        value={collectionId}
        options={collections.map((c) => ({
          value: c.collectionId,
          label: c.name
        }))}
        onChange={(v) => onChange({ collectionId: v })}
      />
      <FacetSelect
        label="Category"
        value={category}
        options={facets.categories.map((v) => ({ value: v, label: v }))}
        onChange={(v) => onChange({ category: v })}
      />
      <FacetSelect
        label="Author"
        value={author}
        options={facets.authors.map((v) => ({ value: v, label: v }))}
        onChange={(v) => onChange({ author: v })}
      />
      <FacetSelect
        label="Tag"
        value={tag}
        options={facets.tags.map((v) => ({ value: v, label: v }))}
        onChange={(v) => onChange({ tag: v })}
      />
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 gap-1">
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}

function FacetSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 rounded-md border border-border bg-background/40 px-2 py-1">
      <span className="text-[11px] text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs outline-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pagination({
  page,
  totalPages,
  onChange
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-center gap-2 text-xs">
      <Button
        variant="ghost"
        size="sm"
        disabled={page === 0}
        onClick={() => onChange(Math.max(0, page - 1))}
      >
        Previous
      </Button>
      <span className="text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
      >
        Next
      </Button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-xl border border-border bg-card/40"
        />
      ))}
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold">No documents yet</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Upload PDFs, DOCX, TXT, or Markdown files — paste raw text — or ingest a
        URL, and Smachs AI will chunk, embed, and make them searchable.
      </p>
      <Button className="mt-4 gap-2" onClick={onUpload}>
        <Plus className="h-4 w-4" />
        Add your first document
      </Button>
    </div>
  );
}

function DocCard({
  row,
  onPreview,
  onDelete,
  onChat
}: {
  row: DocumentRow;
  onPreview: () => void;
  onDelete: () => void;
  onChat: () => void;
}) {
  return (
    <Card
      className={cn(
        "group flex h-full cursor-pointer flex-col gap-3 border-border/70 bg-card/60 p-4 transition-all",
        "hover:border-primary/40 hover:bg-card/80 hover:shadow-md"
      )}
      onClick={onPreview}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            {row.source === "url" ? (
              <LinkIcon className="h-4 w-4" />
            ) : (
              <FileType2 className="h-4 w-4" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="line-clamp-1 text-sm font-medium">
              {row.filename}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {niceFileType(row)} · {formatBytes(row.fileSize)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            title="Chat with this document"
            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onChat();
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Delete document"
            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {row.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {row.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <Badge variant="subtle" className="gap-1">
          <Layers className="h-3 w-3" />
          {row.chunks} chunks
        </Badge>
        {row.category && <Badge variant="outline">{row.category}</Badge>}
        {row.tags?.slice(0, 2).map((t) => (
          <Badge key={t} variant="outline" className="max-w-[120px]">
            <span className="truncate">{t}</span>
          </Badge>
        ))}
        {row.tags && row.tags.length > 2 && (
          <span className="text-[10px]">+{row.tags.length - 2}</span>
        )}
        <span className="ml-auto">{formatDate(row.uploadDate)}</span>
      </div>
    </Card>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
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

type UploadTask = {
  id: string;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
  chunksCreated?: number;
};

function UploadDialog({
  onClose,
  onUploaded,
  onError
}: {
  onClose: () => void;
  onUploaded: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [tab, setTab] = React.useState<"file" | "text" | "url">("file");
  const [files, setFiles] = React.useState<File[]>([]);
  const [title, setTitle] = React.useState("");
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [tasks, setTasks] = React.useState<UploadTask[]>([]);

  const parsedTags = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const canSubmit =
    !busy &&
    (tab === "file"
      ? files.length > 0
      : tab === "text"
      ? text.trim().length > 0
      : url.trim().length > 0);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      if (tab === "file") {
        const initial: UploadTask[] = files.map((f, i) => ({
          id: `${i}-${f.name}`,
          name: f.name,
          status: "pending"
        }));
        setTasks(initial);

        let successCount = 0;
        let errorCount = 0;
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setTasks((prev) =>
            prev.map((t, idx) =>
              idx === i ? { ...t, status: "uploading" } : t
            )
          );
          try {
            const r = await uploadDocument(f, {
              category: category || undefined,
              description: description || undefined,
              tags: parsedTags
            });
            successCount++;
            setTasks((prev) =>
              prev.map((t, idx) =>
                idx === i
                  ? {
                      ...t,
                      status: "done",
                      chunksCreated: r.chunksCreated,
                      message: `${r.chunksCreated} chunks`
                    }
                  : t
              )
            );
          } catch (err) {
            errorCount++;
            setTasks((prev) =>
              prev.map((t, idx) =>
                idx === i
                  ? {
                      ...t,
                      status: "error",
                      message: (err as Error).message || "Failed"
                    }
                  : t
              )
            );
          }
        }

        if (errorCount === 0) {
          onUploaded(`Indexed ${successCount} file${successCount === 1 ? "" : "s"}.`);
        } else if (successCount === 0) {
          onError(`Upload failed for ${errorCount} file${errorCount === 1 ? "" : "s"}.`);
        } else {
          onError(
            `Indexed ${successCount}, ${errorCount} failed. See the list above.`
          );
        }
      } else if (tab === "text") {
        const r = await uploadText(text, {
          title: title || "Pasted text",
          category: category || undefined,
          description: description || undefined,
          tags: parsedTags
        });
        onUploaded(`Indexed pasted text (${r.chunksCreated} chunks).`);
      } else {
        const r = await ingestUrl(url.trim(), {
          category: category || undefined,
          description: description || undefined,
          tags: parsedTags
        });
        onUploaded(`Ingested URL (${r.chunksCreated} chunks).`);
      }
    } catch (err) {
      onError((err as Error).message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden border-border/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight">
              Add to library
            </h2>
            <p className="text-xs text-muted-foreground">
              Uploaded content is chunked and embedded for retrieval.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-b border-border px-5 py-2">
          <TabButton
            active={tab === "file"}
            onClick={() => setTab("file")}
            icon={<Upload className="h-3.5 w-3.5" />}
            label="Upload files"
          />
          <TabButton
            active={tab === "text"}
            onClick={() => setTab("text")}
            icon={<ClipboardPaste className="h-3.5 w-3.5" />}
            label="Paste text"
          />
          <TabButton
            active={tab === "url"}
            onClick={() => setTab("url")}
            icon={<LinkIcon className="h-3.5 w-3.5" />}
            label="From URL"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "file" && (
            <>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const list = Array.from(e.dataTransfer.files || []);
                  if (list.length) setFiles((prev) => [...prev, ...list]);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center transition-colors",
                  dragOver
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-accent/30"
                )}
              >
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) =>
                    setFiles((prev) => [
                      ...prev,
                      ...Array.from(e.target.files ?? [])
                    ])
                  }
                />
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="mt-2 text-sm font-medium">
                  Drop files or click to browse
                </span>
                <span className="text-[11px] text-muted-foreground">
                  PDF · DOCX · TXT · MD · up to 50 MB each
                </span>
              </label>

              {files.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {files.map((f, i) => {
                    const t = tasks[i];
                    return (
                      <div
                        key={`${i}-${f.name}`}
                        className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5 text-xs"
                      >
                        <FileType2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{f.name}</span>
                        <span className="text-muted-foreground">
                          {formatBytes(f.size)}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          {t?.status === "uploading" && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          )}
                          {t?.status === "done" && (
                            <Badge variant="subtle" className="text-[10px]">
                              {t.message}
                            </Badge>
                          )}
                          {t?.status === "error" && (
                            <span className="max-w-[200px] truncate text-destructive">
                              {t.message}
                            </span>
                          )}
                          {!busy && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() =>
                                setFiles((prev) =>
                                  prev.filter((_, idx) => idx !== i)
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === "text" && (
            <div className="flex flex-col gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
              />
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the text you want to index..."
                className="min-h-[160px] resize-y"
              />
              <span className="text-[11px] text-muted-foreground">
                {text.length.toLocaleString()} chars
              </span>
            </div>
          )}

          {tab === "url" && (
            <div className="flex flex-col gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                type="url"
              />
              <span className="text-[11px] text-muted-foreground">
                We'll fetch the page, strip navigation/scripts, and index the
                text. Works best for articles/docs (not SPAs).
              </span>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. policies"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Tags (comma separated)
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="hr, 2026, draft"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary (optional)"
              className="min-h-[70px] resize-y"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy
              ? "Indexing..."
              : tab === "file"
              ? `Upload ${files.length || ""}`.trim()
              : tab === "url"
              ? "Ingest URL"
              : "Index text"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PreviewDrawer({
  documentId,
  onClose,
  onDelete,
  onChat,
  onChanged,
  push
}: {
  documentId: string;
  onClose: () => void;
  onDelete: () => void;
  onChat: (doc: DocumentDetail) => void;
  onChanged: () => void;
  push: (t: Omit<Toast, "id">) => void;
}) {
  const [doc, setDoc] = React.useState<DocumentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [reindexing, setReindexing] = React.useState(false);

  const reload = React.useCallback(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    getDocument(documentId, 30, ctrl.signal)
      .then((d) => setDoc(d))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [documentId]);

  React.useEffect(() => reload(), [reload]);

  const handleExport = async () => {
    try {
      await exportDocument(documentId);
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    }
  };

  const handleRefetch = async () => {
    try {
      setReindexing(true);
      const r = await reindexDocument(documentId, { refetch: true });
      push({
        kind: "success",
        text: `Re-indexed (${r.chunksCreated} chunks).`
      });
      reload();
      onChanged();
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    } finally {
      setReindexing(false);
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
              {doc?.filename ?? "Loading..."}
            </h2>
            {doc && (
              <span className="text-[11px] text-muted-foreground">
                {niceFileType(doc)} · {formatBytes(doc.fileSize)} ·{" "}
                {doc.totalChunks} chunks
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {doc && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => onChat(doc)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit metadata"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Export chunks as JSON"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {doc.source === "url" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Re-fetch and re-index from URL"
                    onClick={handleRefetch}
                    disabled={reindexing}
                  >
                    {reindexing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label="Delete"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg border border-border bg-card/40"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : doc ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Meta label="Document ID" value={doc.documentId} mono />
                <Meta label="Uploaded" value={formatFullDate(doc.uploadDate)} />
                <Meta label="Category" value={doc.category} />
                <Meta label="Author" value={doc.author} />
                <Meta label="Embed model" value={doc.embeddingModel} />
                <Meta
                  label="Last retrieved"
                  value={formatFullDate(doc.lastRetrievedAt ?? null)}
                />
                {doc.sourceUrl && (
                  <div className="col-span-2 rounded-md border border-border bg-background/40 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Source URL
                    </div>
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-1 text-xs text-primary hover:underline"
                    >
                      {doc.sourceUrl}
                    </a>
                  </div>
                )}
              </div>

              {(doc.tags?.length ?? 0) > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {doc.description && (
                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Description
                  </div>
                  <p className="text-sm text-foreground/90">
                    {doc.description}
                  </p>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Chunks preview
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Showing {doc.chunks.length} of {doc.totalChunks}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {doc.chunks.map((c, i) => (
                    <div
                      key={c.chunkId}
                      className="rounded-lg border border-border bg-background/40 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Chunk #{i + 1}</span>
                        <span>{c.charCount} chars</span>
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {editing && doc && (
          <EditMetadataDialog
            doc={doc}
            onClose={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              push({ kind: "success", text: "Metadata updated" });
              reload();
              onChanged();
            }}
            onError={(m) => push({ kind: "error", text: m })}
          />
        )}
      </div>
    </div>
  );
}

function EditMetadataDialog({
  doc,
  onClose,
  onSaved,
  onError
}: {
  doc: DocumentDetail;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [filename, setFilename] = React.useState(doc.filename || "");
  const [category, setCategory] = React.useState(doc.category || "");
  const [author, setAuthor] = React.useState(doc.author || "");
  const [description, setDescription] = React.useState(doc.description || "");
  const [tags, setTags] = React.useState((doc.tags || []).join(", "));
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updateDocument(doc.documentId, {
        filename: filename.trim() || doc.filename,
        category: category.trim(),
        author: author.trim(),
        description: description.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      });
      onSaved();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg border-border/70 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <h3 className="text-sm font-semibold">Edit metadata</h3>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={busy}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Filename / title
            </label>
            <Input value={filename} onChange={(e) => setFilename(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Author
              </label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tags (comma separated)
            </label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[70px]"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CollectionsDialog({
  collections,
  documents,
  onClose,
  onChanged,
  onOpenChat,
  push
}: {
  collections: DocCollection[];
  documents: DocumentRow[];
  onClose: () => void;
  onChanged: () => Promise<void>;
  onOpenChat: (col: DocCollection) => void;
  push: (t: Omit<Toast, "id">) => void;
}) {
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(
    collections[0]?.collectionId ?? null
  );

  const active = collections.find((c) => c.collectionId === activeId) ?? null;
  const inCollection = new Set(active?.documentIds ?? []);

  const createOne = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const c = await createCollection({ name: name.trim() });
      setName("");
      await onChanged();
      setActiveId(c.collectionId);
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const toggleDocument = async (doc: DocumentRow) => {
    if (!active) return;
    try {
      if (inCollection.has(doc.documentId)) {
        await removeFromCollection(active.collectionId, doc.documentId);
      } else {
        await addToCollection(active.collectionId, [doc.documentId]);
      }
      await onChanged();
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    }
  };

  const removeCurrent = async () => {
    if (!active) return;
    if (!confirm(`Delete collection "${active.name}"?`)) return;
    try {
      await deleteCollection(active.collectionId);
      await onChanged();
      setActiveId(null);
      push({ kind: "success", text: "Collection deleted" });
    } catch (err) {
      push({ kind: "error", text: (err as Error).message });
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden border-border/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Collections</h2>
            <p className="text-xs text-muted-foreground">
              Group documents together, then chat scoped to the collection.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid flex-1 grid-cols-[160px_1fr] overflow-hidden sm:grid-cols-[220px_1fr]">
          <aside className="flex flex-col border-r border-border">
            <div className="flex gap-1 border-b border-border p-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New collection"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createOne();
                }}
              />
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                disabled={busy || !name.trim()}
                onClick={createOne}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {collections.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  No collections yet.
                </div>
              ) : (
                collections.map((c) => (
                  <button
                    key={c.collectionId}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2 text-left text-xs hover:bg-accent/40",
                      activeId === c.collectionId && "bg-primary/10 text-primary"
                    )}
                    onClick={() => setActiveId(c.collectionId)}
                  >
                    <span className="line-clamp-1 font-medium">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.documentIds.length} docs
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-w-0 flex-col">
            {active ? (
              <>
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-medium">
                      {active.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {active.documentIds.length} documents
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      onClick={() => onOpenChat(active)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Chat
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={removeCurrent}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Toggle documents
                  </div>
                  <div className="flex flex-col gap-1">
                    {documents.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        No documents on this page. (Collections can include any
                        document across pages — refine filters in the main
                        library to add more.)
                      </div>
                    ) : (
                      documents.map((d) => {
                        const isIn = inCollection.has(d.documentId);
                        return (
                          <label
                            key={d.documentId}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-xs hover:bg-accent/40",
                              isIn && "border-primary/40 bg-primary/5"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isIn}
                              onChange={() => toggleDocument(d)}
                            />
                            <span className="line-clamp-1 flex-1">
                              {d.filename}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {d.chunks} chunks
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="m-auto text-sm text-muted-foreground">
                Create or select a collection to get started.
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}

function Meta({
  label,
  value,
  mono
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 line-clamp-1 text-xs text-foreground/90",
          mono && "font-mono"
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function formatFullDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ConfirmDelete({
  docName,
  busy,
  onCancel,
  onConfirm
}: {
  docName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onCancel}
    >
      <Card
        className="w-full max-w-sm border-border/70 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/15 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold">Delete document?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{docName}</span>{" "}
              and all its chunks will be removed from the vector store. This
              can't be undone.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={busy}
            className="gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
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
