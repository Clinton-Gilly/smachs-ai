"use client";

import * as React from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  Database,
  FileText,
  Lightbulb,
  Mail,
  PenLine,
  Search,
  Sparkles,
  Upload,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPopularQueries, type PopularQuery } from "@/lib/analytics";
import { listDocuments, niceFileType, type DocumentRow } from "@/lib/documents";
import type { ComposerMode } from "./composer";

const generalTasks = [
  {
    title: "Write a professional email",
    category: "Writing",
    icon: Mail,
    prompt: "Help me write a professional email to a client about...",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400"
  },
  {
    title: "Explain a complex topic",
    category: "Learning",
    icon: Lightbulb,
    prompt: "Explain retrieval-augmented generation in simple terms",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400"
  },
  {
    title: "Review and improve code",
    category: "Development",
    icon: Code2,
    prompt: "Review this code and suggest improvements:\n\n",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400"
  },
  {
    title: "Summarize long content",
    category: "Analysis",
    icon: BookOpen,
    prompt: "Summarize the key points from the following:\n\n",
    color: "from-primary/20 to-primary/10 border-primary/20 text-primary"
  },
  {
    title: "Draft a project plan",
    category: "Management",
    icon: PenLine,
    prompt: "Create a project plan with milestones for...",
    color: "from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-400"
  },
  {
    title: "Research a topic",
    category: "Research",
    icon: Search,
    prompt: "Research and explain the key aspects of...",
    color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400"
  }
];

const presetQuestions = [
  { question: "What's covered under the comprehensive motor insurance policy?", category: "Motor Insurance" },
  { question: "What health insurance plans does the company offer?", category: "Health Insurance" },
  { question: "Tell me about the Balanced Investment Fund and its returns", category: "Investment" },
  { question: "How do I calculate my motor insurance premium?", category: "Motor Insurance" },
  { question: "Which hospitals are covered under the health insurance network?", category: "Health Insurance" },
  { question: "How do I file an insurance claim?", category: "Claims" }
];

function guessCategory(q: string): string {
  const l = q.toLowerCase();
  if (l.includes("motor") || l.includes("vehicle")) return "Motor Insurance";
  if (l.includes("health") || l.includes("hospital")) return "Health Insurance";
  if (l.includes("life") || l.includes("death")) return "Life Insurance";
  if (l.includes("invest") || l.includes("fund")) return "Investment";
  if (l.includes("claim")) return "Claims";
  return "General";
}

// ─── RAG Welcome ──────────────────────────────────────────────────────────────

function RagWelcome({
  onPickPrompt,
  ragDocIds,
  onRagDocIdsChange
}: {
  onPickPrompt: (p: string) => void;
  ragDocIds: string[];
  onRagDocIdsChange: (ids: string[]) => void;
}) {
  const [docs, setDocs] = React.useState<DocumentRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listDocuments({ limit: 50 })
      .then((r) => setDocs(r.documents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    onRagDocIdsChange(
      ragDocIds.includes(id) ? ragDocIds.filter((x) => x !== id) : [...ragDocIds, id]
    );
  };

  const starters = [
    "Summarize the key points across my documents.",
    "What are the main topics covered in my uploaded files?",
    "Find any action items or deadlines mentioned.",
    "Compare information across the selected documents."
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-violet-900/30">
            <Database className="h-7 w-7" />
          </div>
          <span className="absolute -inset-2 rounded-3xl bg-violet-500/20 blur-xl -z-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
            Chat with Your Documents
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            Select documents below and ask anything. Answers are grounded in your files with exact citations.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            AI Online
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Database className="h-3 w-3 text-violet-400" />
            {docs.length} document{docs.length !== 1 ? "s" : ""} available
          </span>
        </div>
      </div>

      {/* Document selection */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your Documents</h2>
          {ragDocIds.length > 0 && (
            <button
              onClick={() => onRagDocIdsChange([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl border border-border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/10 py-10 text-center">
            <Upload className="h-8 w-8 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">No documents yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Upload files in the Document Manager</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {docs.map((doc) => {
              const selected = ragDocIds.includes(doc.documentId);
              return (
                <button
                  key={doc.documentId}
                  onClick={() => toggle(doc.documentId)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-violet-500/50 bg-violet-500/10 shadow-sm"
                      : "border-border/60 bg-card/40 hover:border-violet-500/30 hover:bg-card/60"
                  )}
                >
                  <div className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded border-2 transition-colors",
                    selected
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-border"
                  )}>
                    {selected && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-medium">{doc.filename}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {niceFileType(doc)}{doc.totalPages ? ` · ${doc.totalPages}p` : ""}{doc.chunks ? ` · ${doc.chunks} chunks` : ""}
                    </span>
                  </div>
                  {selected && (
                    <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Starter prompts */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Starter prompts</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {starters.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPickPrompt(prompt)}
              className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-left transition-all hover:border-violet-500/30 hover:bg-card/60"
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-400/60 group-hover:text-violet-400 transition-colors" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{prompt}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground/60">
          {ragDocIds.length === 0
            ? "No documents selected — searching across all documents."
            : `Searching ${ragDocIds.length} selected document${ragDocIds.length > 1 ? "s" : ""}.`}
        </p>
      </div>
    </div>
  );
}

// ─── Company Welcome ──────────────────────────────────────────────────────────

function CompanyWelcome({ onPickPrompt }: { onPickPrompt: (p: string) => void }) {
  const [extra, setExtra] = React.useState<{ question: string; category: string }[]>([]);

  React.useEffect(() => {
    getPopularQueries({ limit: 6, timeRange: "30d" })
      .then((res) => {
        const realQuestions = res.queries
          .map((q: PopularQuery) => ({ question: q.query, category: guessCategory(q.query) }))
          .filter((rq) => !presetQuestions.some((p) => p.question.toLowerCase() === rq.question.toLowerCase()));
        setExtra(realQuestions);
      })
      .catch(() => {});
  }, []);

  const allQuestions = [...extra, ...presetQuestions].slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-xl shadow-primary/30">
            <Zap className="h-7 w-7" />
          </div>
          <span className="absolute -inset-2 rounded-3xl bg-primary/20 blur-xl -z-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text">
            Company Assistant
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            Instant answers about policies, insurance, investments, and more.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Popular questions</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {allQuestions.map((item, i) => (
            <button
              key={i}
              onClick={() => onPickPrompt(item.question)}
              className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/30 p-4 text-left transition-all hover:border-primary/30 hover:bg-card/60 hover:shadow-sm"
            >
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium leading-snug">{item.question}</span>
                <span className="text-[10px] text-muted-foreground">{item.category}</span>
              </div>
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-all" />
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground/60">
          Or type your own question — I'll search the knowledge base for you.
        </p>
      </div>
    </div>
  );
}

// ─── Document-scoped Welcome ──────────────────────────────────────────────────

function DocumentWelcome({ onPickPrompt, scopedFilename }: { onPickPrompt: (p: string) => void; scopedFilename: string }) {
  const starters = [
    "Summarize this document in a few sentences.",
    "What are the key points or findings?",
    "List any action items or deadlines mentioned.",
    "Are there any risks or caveats worth noting?"
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-xl shadow-primary/30">
          <FileText className="h-7 w-7" />
          <span className="absolute -inset-2 rounded-3xl bg-primary/20 blur-xl -z-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text">Ask this document</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Answers will be drawn only from <strong className="text-foreground">{scopedFilename}</strong>, with citations to the exact page.
          </p>
        </div>
      </div>
      <div className="w-full">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try asking</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {starters.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPickPrompt(prompt)}
              className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-card/60"
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary/60 group-hover:text-primary transition-colors" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{prompt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── General Welcome ──────────────────────────────────────────────────────────

function GeneralWelcome({ onPickPrompt }: { onPickPrompt: (p: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-indigo-600 text-white shadow-xl shadow-primary/30">
            <Sparkles className="h-8 w-8" />
          </div>
          <span className="absolute -inset-3 rounded-3xl bg-primary/15 blur-2xl -z-10" />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="gradient-text">How can I help</span>
            <br />
            <span className="text-foreground">you today?</span>
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
            Smachs AI is your intelligent workspace assistant — ready for coding, writing, analysis, and more.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">AI Online</span>
          </span>
          <span>·</span>
          <span>General Mode</span>
          <span>·</span>
          <span>Multi-purpose</span>
        </div>
      </div>

      {/* Task cards */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Popular tasks</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {generalTasks.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.title}
                onClick={() => onPickPrompt(t.prompt)}
                className={cn(
                  "group flex flex-col gap-3 rounded-2xl border bg-gradient-to-br p-4 text-left transition-all hover:shadow-md hover:scale-[1.01]",
                  t.color
                )}
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-current/10">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.category}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function Welcome({
  onPickPrompt,
  scopedFilename,
  mode,
  ragDocIds = [],
  onRagDocIdsChange
}: {
  onPickPrompt: (prompt: string) => void;
  scopedFilename?: string;
  mode?: ComposerMode;
  ragDocIds?: string[];
  onRagDocIdsChange?: (ids: string[]) => void;
}) {
  if (scopedFilename) return <DocumentWelcome onPickPrompt={onPickPrompt} scopedFilename={scopedFilename} />;
  if (mode === "rag") return <RagWelcome onPickPrompt={onPickPrompt} ragDocIds={ragDocIds} onRagDocIdsChange={onRagDocIdsChange ?? (() => {})} />;
  if (mode === "coanony") return <CompanyWelcome onPickPrompt={onPickPrompt} />;
  return <GeneralWelcome onPickPrompt={onPickPrompt} />;
}
