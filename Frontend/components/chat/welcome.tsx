"use client";

import * as React from "react";
import {
  ArrowRight,
  Brain,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Database,
  FileSearch,
  FileText,
  Mail,
  MessageSquare,
  PenSquare,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Upload
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPopularQueries, type PopularQuery } from "@/lib/analytics";
import { listDocuments, niceFileType, type DocumentRow } from "@/lib/documents";
import type { ComposerMode } from "./composer";

// ─── General tasks ────────────────────────────────────────────────────────────

const generalTasks = [
  { title: "Help me write a professional email", category: "Writing & Communication", icon: Mail, prompt: "Help me write a professional email to a client about..." },
  { title: "Explain a complex topic in simple terms", category: "Education & Learning", icon: Sparkles, prompt: "Explain retrieval-augmented generation in simple terms" },
  { title: "Review and improve my code", category: "Programming & Development", icon: Code2, prompt: "Review this code and suggest improvements:\n\n" },
  { title: "Analyze data and provide insights", category: "Data Analysis", icon: FileSearch, prompt: "Analyze the following data and provide key insights:\n\n" },
  { title: "Create a project plan or timeline", category: "Project Management", icon: PenSquare, prompt: "Create a project plan with milestones for..." },
  { title: "Generate creative content ideas", category: "Creative & Marketing", icon: Star, prompt: "Give me 10 creative content ideas for..." }
];

// ─── Preset company questions ─────────────────────────────────────────────────

const presetQuestions: { question: string; category: string }[] = [
  { question: "What's covered under the comprehensive motor insurance policy?", category: "Motor Insurance" },
  { question: "What health insurance plans does the company offer?", category: "Health Insurance" },
  { question: "Tell me about the Balanced Investment Fund and its returns", category: "Investment Products" },
  { question: "How do I calculate my motor insurance premium?", category: "Motor Insurance" },
  { question: "What's the difference between comprehensive and third-party motor insurance?", category: "Motor Insurance" },
  { question: "Which hospitals are covered under the health insurance network?", category: "Health Insurance" },
  { question: "How do I file an insurance claim and what documents are required?", category: "Claims" },
  { question: "What is the minimum investment amount for the equity fund?", category: "Investment Products" },
  { question: "Does the life insurance policy cover critical illness?", category: "Life Insurance" },
  { question: "How long does it take to process a motor insurance claim?", category: "Claims" },
  { question: "What are the exclusions under the health insurance policy?", category: "Health Insurance" },
  { question: "Can I top up my investment portfolio online?", category: "Investment Products" }
];

function guessCategory(q: string): string {
  const l = q.toLowerCase();
  if (l.includes("motor") || l.includes("vehicle") || l.includes("car")) return "Motor Insurance";
  if (l.includes("health") || l.includes("hospital") || l.includes("medical")) return "Health Insurance";
  if (l.includes("life") || l.includes("death") || l.includes("beneficiar")) return "Life Insurance";
  if (l.includes("invest") || l.includes("fund") || l.includes("portfolio") || l.includes("return")) return "Investment Products";
  if (l.includes("claim") || l.includes("reimburse")) return "Claims";
  if (l.includes("premium") || l.includes("payment") || l.includes("price")) return "Pricing";
  if (l.includes("policy") || l.includes("cover")) return "Policy";
  if (l.includes("contact") || l.includes("support") || l.includes("help")) return "Support";
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
      ragDocIds.includes(id)
        ? ragDocIds.filter((x) => x !== id)
        : [...ragDocIds, id]
    );
  };

  const starters = [
    "Summarize the key points across my documents.",
    "What are the main topics covered in my uploaded files?",
    "Find any action items or deadlines mentioned.",
    "Compare information across the selected documents."
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero */}
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-xl shadow-violet-900/40">
            <Database className="h-8 w-8" />
          </div>
          <span className="absolute -inset-2 rounded-3xl bg-violet-600/20 blur-xl -z-10" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Chat with Your Documents
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground text-balance leading-relaxed">
            Select one or more uploaded documents below, then ask any question.
            Answers are grounded in your files with exact citations.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">AI Online</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Database className="h-3.5 w-3.5 text-violet-400" />
            <span>RAG Search</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-violet-400" />
            <span>{docs.length} document{docs.length !== 1 ? "s" : ""} available</span>
          </div>
        </div>
      </div>

      {/* Document selection */}
      <div className="w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Your Documents</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ragDocIds.length === 0
                ? "Select documents to scope your search, or chat across all"
                : `${ragDocIds.length} selected — questions will search only these`}
            </p>
          </div>
          {ragDocIds.length > 0 && (
            <button
              onClick={() => onRagDocIdsChange([])}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
            <Upload className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">No documents uploaded yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Go to Document Manager to upload your files
              </p>
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
                    "group flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-violet-500/50 bg-violet-950/30 shadow-md shadow-violet-950/20"
                      : "border-border/60 bg-card/50 hover:border-violet-500/30 hover:bg-card hover:shadow-sm"
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition-colors",
                      selected
                        ? "border-violet-500 bg-violet-500 text-white"
                        : "border-border group-hover:border-violet-400"
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>

                  {/* File icon */}
                  <div className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
                    selected
                      ? "bg-violet-500/20 text-violet-400"
                      : "bg-muted/60 text-muted-foreground group-hover:bg-violet-950/30 group-hover:text-violet-400"
                  )}>
                    <FileText className="h-4 w-4" />
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium leading-tight">
                      {doc.filename}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {niceFileType(doc)}
                      {doc.totalPages ? ` · ${doc.totalPages} pages` : ""}
                      {doc.chunks ? ` · ${doc.chunks} chunks` : ""}
                    </span>
                  </div>

                  {selected && (
                    <span className="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
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
      <div className="w-full">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Starter prompts
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {starters.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPickPrompt(prompt)}
              className={cn(
                "group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-left transition-all",
                "hover:border-violet-500/30 hover:bg-card hover:shadow-sm"
              )}
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-400/70" />
              <span className="line-clamp-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {prompt}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {ragDocIds.length === 0
            ? "No documents selected — I'll search across all your documents."
            : `Searching ${ragDocIds.length} selected document${ragDocIds.length > 1 ? "s" : ""}. Use the doc picker in the toolbar to change selection.`}
        </p>
      </div>
    </div>
  );
}

// ─── Company / Coanony Welcome ────────────────────────────────────────────────

function CompanyWelcome({ onPickPrompt }: { onPickPrompt: (p: string) => void }) {
  const [extra, setExtra] = React.useState<{ question: string; category: string }[]>([]);
  const [filter, setFilter] = React.useState<"popular" | "all">("popular");

  React.useEffect(() => {
    getPopularQueries({ limit: 6, timeRange: "30d" })
      .then((res) => {
        const realQuestions = res.queries
          .map((q: PopularQuery) => ({
            question: q.query,
            category: guessCategory(q.query)
          }))
          .filter(
            (rq) =>
              !presetQuestions.some(
                (p) => p.question.toLowerCase() === rq.question.toLowerCase()
              )
          );
        setExtra(realQuestions);
      })
      .catch(() => {});
  }, []);

  const allQuestions = [...extra, ...presetQuestions];
  const shown = allQuestions.slice(0, filter === "popular" ? 6 : allQuestions.length);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero */}
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-xl shadow-red-900/40">
            <Shield className="h-8 w-8" />
          </div>
          <span className="absolute -inset-2 rounded-3xl bg-red-600/20 blur-xl -z-10" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-r from-red-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
            Personalized Company AI Assistant
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground text-balance leading-relaxed">
            Your intelligent companion for insurance, investments, and financial services.
            Get instant answers about policies, claims, and products.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">AI Online</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-red-400" />
            <span>Company Knowledge</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-red-400" />
            <span>24/7 Available</span>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="w-full">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Popular Company Questions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start with these commonly asked questions about Company products and services
            </p>
          </div>
          <div className="flex shrink-0 gap-1 rounded-full border border-border bg-card/60 p-0.5">
            {(["popular", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                  filter === f
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "popular" && <Star className="h-3 w-3 text-amber-400" />}
                <span className="capitalize">{f}</span>
                {f === "popular" && <ChevronRight className="h-3 w-3 opacity-50" />}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((item, i) => (
            <button
              key={i}
              onClick={() => onPickPrompt(item.question)}
              className={cn(
                "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-4 text-left transition-all",
                "hover:border-red-500/30 hover:bg-card hover:shadow-lg hover:shadow-red-950/20"
              )}
            >
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-950/60 border border-emerald-800/30 text-emerald-400">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-sm font-medium leading-snug line-clamp-2">
                  {item.question}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 rounded bg-emerald-950/50 border border-emerald-800/30 px-2 py-0.5 text-[10px] text-emerald-400 font-medium">
                    <TrendingUp className="h-2.5 w-2.5" />
                    Popular
                  </span>
                </div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
            </button>
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Or type your own question below — I&apos;ll search the company knowledge base for you.
        </p>
      </div>
    </div>
  );
}

// ─── Document-scoped Welcome ──────────────────────────────────────────────────

function DocumentWelcome({
  onPickPrompt,
  scopedFilename
}: {
  onPickPrompt: (p: string) => void;
  scopedFilename: string;
}) {
  const starters = [
    "Summarize this document in a few sentences.",
    "What are the key points or findings?",
    "List any action items, deadlines, or numbers mentioned.",
    "Are there any risks, warnings, or caveats worth noting?"
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-primary-foreground shadow-lg shadow-primary/20 sm:h-16 sm:w-16">
          <FileText className="h-7 w-7" />
          <span className="absolute -inset-1 rounded-2xl bg-primary/20 blur-xl" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ask this document</h1>
          <p className="max-w-xl text-sm text-muted-foreground text-balance">
            Answers will be drawn only from <strong>{scopedFilename}</strong>, with citations pointing to the exact page.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI Online
          </Badge>
          <Badge variant="secondary">Document chat</Badge>
          <Badge variant="outline" className="max-w-[200px]">
            <span className="truncate">{scopedFilename}</span>
          </Badge>
        </div>
      </div>
      <div className="w-full">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Try asking</h2>
          <p className="text-xs text-muted-foreground">Pick a starter or type your own question below.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {starters.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPickPrompt(prompt)}
              className={cn(
                "group flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-left transition-all",
                "hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5"
              )}
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span className="line-clamp-2 text-sm">{prompt}</span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
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
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-primary-foreground shadow-lg shadow-primary/20 sm:h-16 sm:w-16">
          <Brain className="h-7 w-7" />
          <span className="absolute -inset-1 rounded-2xl bg-primary/20 blur-xl" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">General AI Assistant</h1>
          <p className="max-w-xl text-sm text-muted-foreground text-balance">
            Your versatile AI companion for coding, writing, analysis, and creative tasks.
            Ask anything or pick a starter below.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI Online
          </Badge>
          <Badge variant="secondary">General AI</Badge>
          <Badge variant="secondary">Multi-Purpose</Badge>
        </div>
      </div>
      <div className="w-full">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Popular AI tasks</h2>
            <p className="text-xs text-muted-foreground">Click a card to start, or type your own question below.</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" />Popular
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {generalTasks.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.title}
                onClick={() => onPickPrompt(t.prompt)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4 text-left transition-all",
                  "hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5"
                )}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="line-clamp-1 text-sm font-medium">{t.title}</span>
                  <span className="text-[11px] text-muted-foreground">{t.category}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
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
  if (scopedFilename) {
    return <DocumentWelcome onPickPrompt={onPickPrompt} scopedFilename={scopedFilename} />;
  }
  if (mode === "rag") {
    return (
      <RagWelcome
        onPickPrompt={onPickPrompt}
        ragDocIds={ragDocIds}
        onRagDocIdsChange={onRagDocIdsChange ?? (() => {})}
      />
    );
  }
  if (mode === "coanony") {
    return <CompanyWelcome onPickPrompt={onPickPrompt} />;
  }
  return <GeneralWelcome onPickPrompt={onPickPrompt} />;
}
