"use client";

import * as React from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Database,
  FileText,
  Image,
  Paperclip,
  Search,
  Square,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { listDocuments, niceFileType, type DocumentRow } from "@/lib/documents";

export type ComposerMode = "general" | "coanony" | "rag";

const MODE_CONFIG: Record<ComposerMode, { label: string; color: string; placeholder: string }> = {
  general: {
    label: "General",
    color: "bg-primary text-primary-foreground",
    placeholder: "Ask me anything..."
  },
  coanony: {
    label: "Company",
    color: "bg-amber-500 text-white",
    placeholder: "Ask about company policies, products, procedures..."
  },
  rag: {
    label: "Knowledge",
    color: "bg-violet-500 text-white",
    placeholder: "Ask about your uploaded documents..."
  }
};

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"]);

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const Icon = IMAGE_EXTS.has(ext) ? Image : FileText;
  const size =
    file.size < 1024 ? `${file.size}B`
    : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)}KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)}MB`;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs">
      <Icon className="h-3 w-3 shrink-0 text-primary" />
      <span className="max-w-[130px] truncate font-medium">{file.name}</span>
      <span className="text-muted-foreground">{size}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Document Picker ──────────────────────────────────────────────────────────

function DocumentPicker({ selectedIds, onChangeIds }: { selectedIds: string[]; onChangeIds: (ids: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const [docs, setDocs] = React.useState<DocumentRow[]>([]);
  const [search, setSearch] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listDocuments({ limit: 100 }).then((r) => setDocs(r.documents)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = docs.filter((d) => d.filename.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) => {
    onChangeIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const label =
    selectedIds.length === 0 ? "All docs"
    : selectedIds.length === 1 ? (docs.find((d) => d.documentId === selectedIds[0])?.filename ?? "1 doc")
    : `${selectedIds.length} docs`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
          selectedIds.length > 0
            ? "border-violet-500/50 bg-violet-500/10 text-violet-400"
            : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border"
        )}
      >
        <Database className="h-3 w-3" />
        <span className="max-w-[110px] truncate">{label}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-xl shadow-black/20">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full rounded-lg bg-muted/40 py-1.5 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {docs.length === 0 ? "No documents uploaded yet" : "No matches"}
              </div>
            ) : (
              filtered.map((doc) => {
                const selected = selectedIds.includes(doc.documentId);
                return (
                  <button
                    key={doc.documentId}
                    type="button"
                    onClick={() => toggle(doc.documentId)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted/40",
                      selected && "bg-violet-500/5"
                    )}
                  >
                    <div className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded border-2 transition-colors",
                      selected ? "border-violet-500 bg-violet-500 text-white" : "border-border bg-background"
                    )}>
                      {selected && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{doc.filename}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {niceFileType(doc)}{doc.totalPages ? ` · ${doc.totalPages}p` : ""}{doc.chunks ? ` · ${doc.chunks} chunks` : ""}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-[11px] text-muted-foreground">
              {selectedIds.length === 0 ? "Searching all documents" : `${selectedIds.length} selected`}
            </span>
            {selectedIds.length > 0 && (
              <button type="button" onClick={() => onChangeIds([])} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  streaming,
  mode,
  onModeChange,
  attachedFiles = [],
  onFilesChange,
  ragDocIds = [],
  onRagDocIdsChange
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
  attachedFiles?: File[];
  onFilesChange?: (files: File[]) => void;
  ragDocIds?: string[];
  onRagDocIdsChange?: (ids: string[]) => void;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const canSend = !!(value.trim() || attachedFiles.length > 0);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && canSend) onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    onFilesChange?.([...attachedFiles, ...picked]);
    e.target.value = "";
  };

  const modeConf = MODE_CONFIG[mode];

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-4 sm:px-5 sm:pb-5">
      <div className={cn(
        "relative rounded-2xl border bg-card/80 backdrop-blur-sm shadow-lg transition-all",
        "focus-within:border-primary/40 focus-within:shadow-primary/10 focus-within:shadow-xl",
        "border-border/60"
      )}>
        {/* File chips */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {attachedFiles.map((file, i) => (
              <FileChip key={i} file={file} onRemove={() => onFilesChange?.(attachedFiles.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={attachedFiles.length > 0 ? "Ask about the attached file(s)…" : modeConf.placeholder}
          rows={1}
          className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
        />

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          {/* Left actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Attach file"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>

            {/* Mode toggle */}
            <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5 text-xs gap-0.5">
              {(["general", "coanony", "rag"] as const).map((m) => {
                const conf = MODE_CONFIG[m];
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onModeChange(m)}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-medium transition-all",
                      mode === m
                        ? conf.color + " shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {conf.label}
                  </button>
                );
              })}
            </div>

            {mode === "rag" && onRagDocIdsChange && (
              <DocumentPicker selectedIds={ragDocIds} onChangeIds={onRagDocIdsChange} />
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] text-muted-foreground/50 sm:inline">Enter to send</span>
            {streaming ? (
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-xl"
                onClick={onStop}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <button
                onClick={onSend}
                disabled={disabled || !canSend}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl transition-all",
                  canSend && !disabled
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 hover:shadow-md"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
        Smachs AI can make mistakes — verify important information.
      </p>
    </div>
  );
}
