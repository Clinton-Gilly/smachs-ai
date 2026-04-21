"use client";

import * as React from "react";
import { BookOpen, FileText, Plus, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentsView } from "./documents-view";
import { KnowledgeView } from "@/components/knowledge/knowledge-view";
import { getDocumentStats } from "@/lib/documents";
import { listCollections } from "@/lib/collections";

type Tab = "documents" | "knowledge";

export function DocumentManagerView() {
  const [tab, setTab] = React.useState<Tab>("documents");
  const [docCount, setDocCount] = React.useState<number | null>(null);
  const [kbCount, setKbCount] = React.useState<number | null>(null);

  // Triggers passed into child views
  const [triggerUpload, setTriggerUpload] = React.useState(0);
  const [triggerNewKb, setTriggerNewKb] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("All");

  // Fetch counts for tab badges
  React.useEffect(() => {
    getDocumentStats()
      .then((s) => setDocCount(s.totalDocuments ?? 0))
      .catch(() => {});
    listCollections()
      .then((cols) => setKbCount(cols.length))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Top header ──────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Document Manager</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload documents or build a knowledge base—chat with your data and get instant insights!
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              size="sm"
              onClick={() => {
                setTab("documents");
                setTriggerUpload((n) => n + 1);
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Document
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => {
                setTab("knowledge");
                setTriggerNewKb((n) => n + 1);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Knowledge Base
            </Button>
          </div>
        </div>

        {/* ── Tab switcher ───────────────────────────────────────────── */}
        <div className="mt-4 flex rounded-xl bg-muted/50 border border-border/50 p-1 gap-1">
          <button
            onClick={() => setTab("documents")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              tab === "documents"
                ? "bg-background text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4" />
            My Documents
            {docCount !== null && (
              <span className={cn(
                "ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                tab === "documents"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {docCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab("knowledge")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              tab === "knowledge"
                ? "bg-background text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-4 w-4" />
            My Knowledge Bases
            {kbCount !== null && (
              <span className={cn(
                "ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                tab === "knowledge"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {kbCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Search + filter row (documents tab only) ───────────────── */}
        {tab === "documents" && (
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search my docs..."
                className="h-9 pl-9 text-sm"
              />
            </div>
            {["All", "PDF", "DOCX", "TXT", "MD"].map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  typeFilter === f
                    ? "border-border bg-background text-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Tab content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {tab === "documents" ? (
          <DocumentsView
            externalSearch={search}
            externalTypeFilter={typeFilter !== "All" ? typeFilter : ""}
            triggerUpload={triggerUpload}
            onCountChange={setDocCount}
          />
        ) : (
          <KnowledgeView
            triggerCreate={triggerNewKb}
            onCountChange={setKbCount}
          />
        )}
      </div>
    </div>
  );
}
