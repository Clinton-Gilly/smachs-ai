"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  Globe,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  XCircle,
  Zap,
  Pencil,
  Link as LinkIcon,
  Tag,
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  getAnalyticsStats,
  getPopularQueries,
  getSlowQueries,
  getRetrievalMethods,
  getFeedbackSummary,
  clearCache,
  getUsageDashboard,
  resetTokenStats,
  type TimeRange,
  type AnalyticsStats,
  type PopularQuery,
  type SlowQuery,
  type RetrievalMethod,
  type FeedbackSummary,
  type CommonIssue,
  type UsageDashboard
} from "@/lib/analytics";
import {
  listDocuments,
  getDocumentStats,
  getDocumentFacets,
  uploadDocument,
  ingestUrl,
  uploadText,
  deleteDocument,
  updateDocument,
  reindexDocument,
  exportDocument,
  formatBytes,
  niceFileType,
  type DocumentRow,
  type DocumentStats,
  type DocumentFacets,
  type UploadMeta
} from "@/lib/documents";
import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  type DocCollection
} from "@/lib/collections";
import { fetchHealth } from "@/lib/api";
import { threadsStore, type ChatThread } from "@/lib/threads";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  type AuthUser
} from "@/lib/auth";

// ─── helpers ────────────────────────────────────────────────────────────────

function ms(n: number) {
  if (!n || n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(2)}s`;
}

function pct(n: number) {
  return `${Math.round(n)}%`;
}

function fmtDate(iso: string | number | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(iso);
  }
}

function isToday(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

type Toast = { id: string; kind: "success" | "error" | "info"; text: string };

function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, ...t }]);
    window.setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 4200);
  }, []);
  return { toasts, push };
}

// ─── shared UI ───────────────────────────────────────────────────────────────

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg backdrop-blur animate-in slide-in-from-right-4 fade-in-0",
            t.kind === "success" && "bg-emerald-950/90 border-emerald-800 text-emerald-100",
            t.kind === "error" && "bg-red-950/90 border-red-800 text-red-100",
            t.kind === "info" && "bg-card border-border text-foreground"
          )}
        >
          {t.kind === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
          {t.kind === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
          {t.kind === "info" && <Activity className="h-4 w-4 shrink-0 text-primary" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = p >= 90 ? "bg-red-500" : p >= 70 ? "bg-amber-500" : p >= 50 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${p}%` }} />
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, color = "text-primary", trend
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn("mt-0.5 rounded-lg p-2 bg-muted/60", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        {trend && (
          <div className={cn("text-xs font-medium", trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground")}>
            {trend === "up" ? <TrendingUp className="h-4 w-4" /> : trend === "down" ? <TrendingDown className="h-4 w-4" /> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// SVG Donut chart
function DonutChart({ segments, size = 120 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        <div className="text-xs text-muted-foreground">No data</div>
      </div>
    );
  }
  const r = 40; const cx = 50; const cy = 50;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="18" />
      {segments.map((seg, i) => {
        const dashLen = (seg.value / total) * circ;
        const dashOffset = circ - (offset / total) * circ;
        offset += seg.value;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeDasharray={`${dashLen} ${circ - dashLen}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={28} fill="hsl(var(--background))" />
    </svg>
  );
}

// CSS bar chart
function BarChart({ bars, maxBars = 6 }: {
  bars: { label: string; value: number; color?: string }[];
  maxBars?: number;
}) {
  const shown = bars.slice(0, maxBars);
  const maxVal = Math.max(...shown.map((b) => b.value), 1);
  return (
    <div className="space-y-2">
      {shown.map((bar, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground truncate">{bar.label}</span>
          <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
            <div
              className={cn("h-full rounded-sm transition-all", bar.color ?? "bg-primary")}
              style={{ width: `${(bar.value / maxVal) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-[10px] text-muted-foreground tabular-nums">{bar.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const [health, setHealth] = React.useState<Record<string, unknown> | null>(null);
  const [docStats, setDocStats] = React.useState<DocumentStats | null>(null);
  const [docRows, setDocRows] = React.useState<DocumentRow[]>([]);
  const [colls, setColls] = React.useState<DocCollection[]>([]);
  const [usage, setUsage] = React.useState<UsageDashboard | null>(null);
  const [analyticsStats, setAnalyticsStats] = React.useState<AnalyticsStats | null>(null);
  const [threads, setThreads] = React.useState<ChatThread[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const allThreads = threadsStore.list();
      setThreads(allThreads);
      const [h, ds, cl, u, as_, docs] = await Promise.allSettled([
        fetchHealth(),
        getDocumentStats(),
        listCollections(),
        getUsageDashboard(),
        getAnalyticsStats("24h"),
        listDocuments({ limit: 200 })
      ]);
      if (h.status === "fulfilled") setHealth(h.value);
      if (ds.status === "fulfilled") setDocStats(ds.value);
      if (cl.status === "fulfilled") setColls(cl.value);
      if (u.status === "fulfilled") setUsage(u.value);
      if (as_.status === "fulfilled") setAnalyticsStats(as_.value);
      if (docs.status === "fulfilled") setDocRows(docs.value.documents);
      setLastUpdated(new Date());
    } catch {
      // partial data still shown from allSettled above
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load().catch(() => {}); }, [load]);

  // Derived stats from threads
  const totalChats = threads.length;
  const activeToday = threads.filter((t) => isToday(t.updatedAt)).length;
  const generalThreads = threads.filter((t) => t.mode === "general");
  const ragThreads = threads.filter((t) => t.mode === "rag");
  const engagementPct = totalChats > 0 ? Math.round((activeToday / totalChats) * 100) : 0;
  const todayGenMsgs = generalThreads
    .filter((t) => isToday(t.updatedAt))
    .reduce((s, t) => s + t.messages.length, 0);
  const todayRagMsgs = ragThreads
    .filter((t) => isToday(t.updatedAt))
    .reduce((s, t) => s + t.messages.length, 0);

  // File type distribution from doc rows
  const fileTypeCounts = docRows.reduce<Record<string, number>>((acc, row) => {
    const t = niceFileType(row);
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const fileTypeBars = Object.entries(fileTypeCounts)
    .map(([label, value]) => ({ label, value, color: "bg-primary" }))
    .sort((a, b) => b.value - a.value);

  // Chat distribution segments
  const chatSegments = [
    { label: `Regular (${totalChats > 0 ? Math.round((generalThreads.length / totalChats) * 100) : 0}%)`, value: generalThreads.length, color: "#dc2626" },
    { label: `RAG (${totalChats > 0 ? Math.round((ragThreads.length / totalChats) * 100) : 0}%)`, value: ragThreads.length, color: "#f59e0b" }
  ];

  const healthStatus = (health as { status?: string })?.status ?? "unknown";
  const isHealthy = healthStatus === "healthy";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">System Analytics</h2>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              Last updated {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => {}}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Users" value={totalChats || "—"} sub="0 new this week" icon={Users} color="text-emerald-400" />
        <StatCard label="Documents" value={docStats?.totalDocuments ?? "—"} sub="87% success rate" icon={FileText} color="text-blue-400" />
        <StatCard label="Total Chats" value={totalChats} sub={`${threads.reduce((s, t) => s + t.messages.length, 0)} messages`} icon={MessageSquare} color="text-violet-400" />
        <StatCard label="Knowledge Bases" value={colls.length} sub={`${colls.reduce((s, c) => s + c.documentIds.length, 0)} docs total`} icon={BookOpen} color="text-cyan-400" />
        <StatCard label="Active Today" value={activeToday} sub={`${pct(engagementPct)} of users`} icon={Activity} color="text-amber-400" />
        <StatCard label="Engagement" value={`${engagementPct}%`} sub="User engagement rate" icon={TrendingUp} color="text-rose-400" />
      </div>

      {/* Health banner */}
      <div className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3",
        isHealthy ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-300" : "border-red-800/40 bg-red-950/30 text-red-300"
      )}>
        {isHealthy ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
        <div className="flex-1">
          <p className="text-sm font-medium capitalize">System {healthStatus}</p>
          <p className="text-xs opacity-70">
            MongoDB: {String((health as { services?: { mongodb?: string } })?.services?.mongodb ?? "—")} ·{" "}
            Gemini API: {String((health as { services?: { gemini?: string } })?.services?.gemini ?? "—")}
          </p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
      </div>

      {/* Row 2: Chat Distribution + Document Processing Status + Today's Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chat Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-400" /> Chat Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <DonutChart segments={chatSegments} size={130} />
            <div className="flex flex-wrap justify-center gap-3">
              {chatSegments.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document Processing Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" /> Document Processing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Completed", value: docStats?.totalDocuments ?? 0, color: "text-emerald-400" },
              { label: "Processing", value: 0, color: "text-amber-400" },
              { label: "Failed", value: 0, color: "text-red-400" }
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={cn("text-sm font-semibold", color)}>{value}</span>
              </div>
            ))}
            <div className="pt-2 text-center">
              <p className="text-3xl font-bold">
                {docStats?.totalDocuments
                  ? pct(Math.round(((docStats.totalDocuments) / (docStats.totalDocuments)) * 100))
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Overall Success Rate</p>
            </div>
          </CardContent>
        </Card>

        {/* Today's Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" /> Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              { label: "Chat Messages", value: todayGenMsgs, color: "text-violet-400" },
              { label: "RAG Messages", value: todayRagMsgs, color: "text-amber-400" },
              { label: "Chat Users", value: generalThreads.filter((t) => isToday(t.updatedAt)).length, color: "text-blue-400" },
              { label: "RAG Users", value: ragThreads.filter((t) => isToday(t.updatedAt)).length, color: "text-emerald-400" }
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Popular File Types + System Performance Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Popular File Types */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-400" /> Popular File Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fileTypeBars.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No documents yet</p>
            ) : (
              <BarChart bars={fileTypeBars} />
            )}
          </CardContent>
        </Card>

        {/* System Performance Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-blue-400" /> System Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              { label: "Search Queries", value: analyticsStats?.queryStats?.totalQueries ?? 0, color: "text-red-400" },
              { label: "File Uploads", value: docStats?.totalDocuments ?? 0, color: "text-amber-400" },
              {
                label: "Avg Docs/KB",
                value: colls.length > 0
                  ? (colls.reduce((s, c) => s + c.documentIds.length, 0) / colls.length).toFixed(1)
                  : "—",
                color: "text-foreground"
              },
              {
                label: "Avg Processing",
                value: analyticsStats?.queryStats?.avgTotalTime
                  ? ms(analyticsStats.queryStats.avgTotalTime)
                  : "0s",
                color: "text-foreground"
              }
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center border border-border/30 rounded-lg p-3">
                <p className={cn("text-xl font-bold", color)}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Rate limits */}
      {usage && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">API Rate Limits</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {usage.model} · {usage.tier}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Requests / min", data: usage.limits.rpm },
              { label: "Tokens / min", data: usage.limits.tpm },
              { label: "Requests / day", data: usage.limits.rpd }
            ].map(({ label, data }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums">
                    {data.current.toLocaleString()} / {data.limit.toLocaleString()}
                    <span className="ml-1.5 text-muted-foreground">({pct(data.percentUsed)})</span>
                  </span>
                </div>
                <ProgressBar value={data.current} max={data.limit} />
                <p className="text-[10px] text-muted-foreground text-right">Resets in {data.resetIn}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Deep Analytics ──────────────────────────────────────────────────────

function DeepAnalyticsTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("7d");
  const [stats, setStats] = React.useState<AnalyticsStats | null>(null);
  const [popular, setPopular] = React.useState<PopularQuery[]>([]);
  const [slow, setSlow] = React.useState<SlowQuery[]>([]);
  const [methods, setMethods] = React.useState<RetrievalMethod[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, sl, m] = await Promise.allSettled([
        getAnalyticsStats(timeRange),
        getPopularQueries({ limit: 20, timeRange }),
        getSlowQueries({ limit: 20 }),
        getRetrievalMethods(timeRange)
      ]);
      if (s.status === "fulfilled") setStats(s.value);
      if (p.status === "fulfilled") setPopular(p.value.queries);
      if (sl.status === "fulfilled") setSlow(sl.value.queries);
      if (m.status === "fulfilled") setMethods(m.value.methods);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  React.useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold flex-1">Deep Analytics</h2>
        <div className="flex gap-1 rounded-lg border border-border/60 p-0.5">
          {(["1h", "24h", "7d", "30d"] as TimeRange[]).map((r) => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors",
                r === timeRange ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {r}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Performance KPIs */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Queries" value={stats.queryStats?.totalQueries ?? 0} icon={Activity} color="text-primary" />
          <StatCard label="Avg Total Time" value={ms(stats.queryStats?.avgTotalTime ?? 0)} sub={`Retrieval: ${ms(stats.queryStats?.avgRetrievalTime ?? 0)}`} icon={Clock} color="text-blue-400" />
          <StatCard label="Avg Generation" value={ms(stats.queryStats?.avgGenerationTime ?? 0)} icon={Sparkles} color="text-amber-400" />
          <StatCard label="Cache Hit Rate" value={stats.cacheStats?.hitRate ?? "—"} sub={`${stats.cacheStats?.hits ?? 0} hits · ${stats.cacheStats?.misses ?? 0} misses`} icon={Zap} color="text-emerald-400" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Retrieval performance breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" /> Retrieval Method Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : methods.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              methods.map((m) => {
                const maxCount = Math.max(...methods.map((x) => x.count));
                return (
                  <div key={m.method} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium capitalize">{m.method}</span>
                      <span className="text-muted-foreground">
                        {m.count} calls · avg {ms(m.avgTime)} · {m.avgContexts?.toFixed(1)} ctx
                      </span>
                    </div>
                    <ProgressBar value={m.count} max={maxCount} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Context analysis */}
        {stats && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4 text-violet-400" /> Context Retrieval Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                {[
                  { label: "Avg Retrieved", value: (stats.queryStats?.avgContextsRetrieved ?? 0).toFixed(1) },
                  { label: "Avg Used", value: (stats.queryStats?.avgContextsFinal ?? 0).toFixed(1) },
                  { label: "Cache Backend", value: stats.cacheStats?.backend ?? "—" },
                  { label: "Cache Size", value: stats.cacheStats?.memorySize ?? 0 }
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-muted/40 p-3">
                    <p className="text-lg font-semibold">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Context utilization</span>
                  <span>
                    {stats.queryStats?.avgContextsRetrieved > 0
                      ? pct(Math.round((stats.queryStats.avgContextsFinal / stats.queryStats.avgContextsRetrieved) * 100))
                      : "—"}
                  </span>
                </div>
                <ProgressBar
                  value={stats.queryStats?.avgContextsFinal ?? 0}
                  max={stats.queryStats?.avgContextsRetrieved ?? 1}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top 20 popular queries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Top Queries ({timeRange})
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">{popular.length} queries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : popular.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
          ) : (
            <div className="space-y-1">
              {popular.map((q, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/40 transition-colors">
                  <span className="w-5 shrink-0 text-[10px] font-bold text-muted-foreground/50 mt-0.5 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs line-clamp-1">{q.query}</p>
                    <p className="text-[10px] text-muted-foreground">{q.count}× · avg {ms(q.avgTime)} · {fmtDate(q.lastQueried)}</p>
                  </div>
                  <ProgressBar value={q.count} max={popular[0].count} className="w-16 mt-1.5 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slow queries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" /> Slow Queries (top 20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : slow.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No slow queries — great performance!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">Query</th>
                    <th className="px-2 py-2 text-right font-medium">Total</th>
                    <th className="px-2 py-2 text-right font-medium">Retrieval</th>
                    <th className="px-2 py-2 text-right font-medium">Generation</th>
                    <th className="px-2 py-2 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {slow.map((q, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="px-2 py-2 max-w-[250px]"><span className="line-clamp-1">{q.query}</span></td>
                      <td className="px-2 py-2 text-right text-red-400 tabular-nums font-medium">{ms(q.totalTime)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground tabular-nums">{ms(q.retrievalTime)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground tabular-nums">{ms(q.generationTime)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground whitespace-nowrap">{fmtDate(q.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Query Classifications ───────────────────────────────────────────────

function QueryClassificationsTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const [methods, setMethods] = React.useState<RetrievalMethod[]>([]);
  const [popular, setPopular] = React.useState<PopularQuery[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.allSettled([
        getRetrievalMethods("7d"),
        getPopularQueries({ limit: 50, timeRange: "7d" })
      ]);
      if (m.status === "fulfilled") setMethods(m.value.methods);
      if (p.status === "fulfilled") setPopular(p.value.queries);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load().catch(() => {}); }, [load]);

  // Classify queries by length/complexity
  const classify = (q: string) => {
    const words = q.trim().split(/\s+/).length;
    if (words <= 3) return "Short";
    if (words <= 8) return "Medium";
    if (words <= 15) return "Long";
    return "Complex";
  };

  const classified = popular.reduce<Record<string, number>>((acc, q) => {
    const c = classify(q.query);
    acc[c] = (acc[c] ?? 0) + q.count;
    return acc;
  }, {});

  const classColors: Record<string, string> = {
    Short: "bg-emerald-500",
    Medium: "bg-blue-500",
    Long: "bg-amber-500",
    Complex: "bg-red-500"
  };

  const classBars = ["Short", "Medium", "Long", "Complex"].map((label) => ({
    label, value: classified[label] ?? 0, color: classColors[label]
  }));

  const totalClassified = classBars.reduce((s, b) => s + b.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Query Classifications</h2>
          <p className="text-xs text-muted-foreground">How queries are classified and routed in the RAG pipeline</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Query length distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Query Complexity Distribution</CardTitle>
            <CardDescription className="text-xs">Based on word count analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : totalClassified === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No query data yet</p>
            ) : (
              <>
                <BarChart bars={classBars} />
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {classBars.map((b) => (
                    <div key={b.label} className="text-center">
                      <div className="text-lg font-bold">{totalClassified > 0 ? pct(Math.round((b.value / totalClassified) * 100)) : "0%"}</div>
                      <div className="text-[10px] text-muted-foreground">{b.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Retrieval method routing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Retrieval Method Routing</CardTitle>
            <CardDescription className="text-xs">How queries are distributed across retrieval strategies</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : methods.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No routing data yet</p>
            ) : (
              <div className="space-y-3">
                {methods.map((m) => {
                  const totalCalls = methods.reduce((s, x) => s + x.count, 0);
                  return (
                    <div key={m.method} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium capitalize">{m.method}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {totalCalls > 0 ? pct(Math.round((m.count / totalCalls) * 100)) : "0%"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{m.count} calls · avg {ms(m.avgTime)}</span>
                      </div>
                      <ProgressBar value={m.count} max={Math.max(...methods.map((x) => x.count))} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Query samples by type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Sample Queries by Complexity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : popular.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No queries yet</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {["Short", "Medium", "Long", "Complex"].map((type) => {
                const samples = popular.filter((q) => classify(q.query) === type).slice(0, 3);
                return (
                  <div key={type} className="rounded-lg border border-border/40 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("h-2 w-2 rounded-full", classColors[type])} />
                      <span className="text-xs font-medium">{type}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{samples.length} samples</span>
                    </div>
                    {samples.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">No samples</p>
                    ) : (
                      <ul className="space-y-1">
                        {samples.map((q, i) => (
                          <li key={i} className="text-[10px] text-muted-foreground line-clamp-1">• {q.query}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: User Engagement ─────────────────────────────────────────────────────

function UserEngagementTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const threads = React.useMemo(() => threadsStore.list(), []);
  const [feedback, setFeedback] = React.useState<FeedbackSummary | null>(null);
  const [issues, setIssues] = React.useState<CommonIssue[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getFeedbackSummary("30d")
      .then((r) => { setFeedback(r.summary); setIssues(r.commonIssues); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalMsgs = threads.reduce((s, t) => s + t.messages.length, 0);
  const avgMsgsPerThread = threads.length > 0 ? (totalMsgs / threads.length).toFixed(1) : "0";
  const generalCount = threads.filter((t) => t.mode === "general").length;
  const ragCount = threads.filter((t) => t.mode === "rag").length;
  const archivedCount = threads.filter((t) => t.archived).length;

  // Sessions by day (last 7 days)
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const sessionsByDay = dayLabels.map((d) => ({
    label: d.toLocaleDateString(undefined, { weekday: "short" }),
    value: threads.filter((t) => {
      const td = new Date(t.updatedAt);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth() && td.getDate() === d.getDate();
    }).length,
    color: "bg-primary"
  }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">User Engagement</h2>
        <p className="text-xs text-muted-foreground">Chat usage patterns and satisfaction metrics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Sessions" value={threads.length} sub={`${archivedCount} archived`} icon={MessageSquare} color="text-violet-400" />
        <StatCard label="Total Messages" value={totalMsgs} sub={`Avg ${avgMsgsPerThread}/session`} icon={Activity} color="text-blue-400" />
        <StatCard label="General Chats" value={generalCount} sub={`${threads.length > 0 ? pct(Math.round((generalCount / threads.length) * 100)) : "0%"} of sessions`} icon={MessageSquare} color="text-emerald-400" />
        <StatCard label="RAG Chats" value={ragCount} sub={`${threads.length > 0 ? pct(Math.round((ragCount / threads.length) * 100)) : "0%"} of sessions`} icon={BookOpen} color="text-amber-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sessions last 7 days */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sessions — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart bars={sessionsByDay} />
          </CardContent>
        </Card>

        {/* Chat mode distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Session Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <DonutChart
              segments={[
                { label: "General", value: generalCount, color: "#7c3aed" },
                { label: "RAG", value: ragCount, color: "#f59e0b" }
              ]}
              size={120}
            />
            <div className="grid grid-cols-2 gap-4 w-full">
              {[
                { label: "General Chat", value: generalCount, color: "bg-violet-500" },
                { label: "RAG Chat", value: ragCount, color: "bg-amber-500" }
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", color)} />
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{value} sessions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-emerald-400" /> Satisfaction (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : !feedback ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No feedback collected yet</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold">{feedback.totalFeedback}</p>
                    <p className="text-[10px] text-muted-foreground">Total Feedback</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{feedback.helpfulPercentage}</p>
                    <p className="text-[10px] text-muted-foreground">Helpful</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{feedback.avgRating?.toFixed(1) ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Helpful responses</span>
                    <span>{feedback.helpfulCount} / {feedback.totalFeedback}</span>
                  </div>
                  <ProgressBar value={feedback.helpfulCount} max={feedback.totalFeedback} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : issues.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No issues reported</p>
            ) : (
              <div className="space-y-2">
                {issues.slice(0, 8).map((issue, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{issue.issue}</span>
                    <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">{issue.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: User Management ────────────────────────────────────────────────────

const EMPTY_FORM = { username: "", email: "", displayName: "", password: "", role: "user" as "user" | "admin" };

function UserManagementTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const [users, setUsers] = React.useState<AuthUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [editUser, setEditUser] = React.useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AuthUser | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [editForm, setEditForm] = React.useState<{ displayName: string; email: string; password: string; role: "user" | "admin"; isActive: boolean }>({ displayName: "", email: "", password: "", role: "user", isActive: true });
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const u = await listUsers();
      setUsers(u);
    } catch (e: any) {
      push({ kind: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [push]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) =>
    [u.username, u.displayName, u.email].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createUser(form);
      push({ kind: "success", text: `Account created for @${form.username}` });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      load();
    } catch (err: any) {
      push({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (u: AuthUser) => {
    setEditUser(u);
    setEditForm({ displayName: u.displayName, email: u.email, password: "", role: u.role, isActive: u.isActive });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setBusy(true);
    try {
      const patch: any = { displayName: editForm.displayName, email: editForm.email, role: editForm.role, isActive: editForm.isActive };
      if (editForm.password) patch.password = editForm.password;
      await updateUser(editUser._id, patch);
      push({ kind: "success", text: `@${editUser.username} updated` });
      setEditUser(null);
      load();
    } catch (err: any) {
      push({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteUser(deleteTarget._id);
      push({ kind: "success", text: `@${deleteTarget.username} deleted` });
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      push({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u: AuthUser) => {
    try {
      await updateUser(u._id, { isActive: !u.isActive });
      push({ kind: "info", text: `@${u.username} ${u.isActive ? "disabled" : "enabled"}` });
      load();
    } catch (err: any) {
      push({ kind: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">User Management</h2>
          <p className="text-xs text-muted-foreground">Create and manage user accounts</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> Create User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Users" value={users.length} icon={Users} color="text-blue-400" />
        <StatCard label="Active" value={users.filter((u) => u.isActive).length} icon={Activity} color="text-emerald-400" />
        <StatCard label="Admins" value={users.filter((u) => u.role === "admin").length} icon={ShieldCheck} color="text-primary" />
      </div>

      {/* Search */}
      <Input
        placeholder="Search by name, username or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs"
      />

      {/* Users table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">User</th>
                <th className="px-4 py-2.5 text-left font-medium">Username</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
              ) : filtered.map((u) => (
                <tr key={u._id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-white text-xs font-bold">
                        {(u.displayName || u.username).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.displayName || u.username}</p>
                        <p className="text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">@{u.username}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={cn("text-[10px]", u.role === "admin" ? "border-primary/40 text-primary" : "")}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleActive(u)} title="Toggle active">
                      <Badge variant={u.isActive ? "default" : "secondary"} className={cn("text-[10px] cursor-pointer", u.isActive ? "bg-emerald-900/30 text-emerald-300 border-emerald-800/40" : "")}>
                        {u.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{u.createdAt ? fmtDate(new Date(u.createdAt).getTime()) : "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => openEdit(u)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteTarget(u)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create User Account</DialogTitle>
            <DialogDescription>Create a new account. Share the credentials with the user.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Username *</label>
                <Input required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="john_doe" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Display Name</label>
                <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="John Doe" className="h-8 text-xs" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Email *</label>
              <Input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@company.com" className="h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Password *</label>
              <Input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" className="h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "user" | "admin" }))}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Account"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit @{editUser?.username}</DialogTitle>
            <DialogDescription>Leave password blank to keep the current one.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Display Name</label>
                <Input value={editForm.displayName} onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Email</label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">New Password</label>
              <Input type="password" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as "user" | "admin" }))}
                  className="h-8 rounded-md border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Status</label>
                <select value={editForm.isActive ? "active" : "disabled"} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === "active" }))}
                  className="h-8 rounded-md border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete @{deleteTarget?.username}?</DialogTitle>
            <DialogDescription>This will permanently remove the account and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: System Performance ──────────────────────────────────────────────────

function SystemPerformanceTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const [dashboard, setDashboard] = React.useState<UsageDashboard | null>(null);
  const [stats, setStats] = React.useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [resetting, setResetting] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.allSettled([getUsageDashboard(), getAnalyticsStats("24h")]);
      if (d.status === "fulfilled") setDashboard(d.value);
      if (s.status === "fulfilled") setStats(s.value);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load().catch(() => {}); }, [load]);

  const handleResetTokens = async () => {
    setResetting(true);
    try { await resetTokenStats(); push({ kind: "success", text: "Token stats reset" }); load(); }
    catch (e: unknown) { push({ kind: "error", text: e instanceof Error ? e.message : "Failed" }); }
    finally { setResetting(false); }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try { await clearCache(); push({ kind: "success", text: "Cache cleared" }); load(); }
    catch (e: unknown) { push({ kind: "error", text: e instanceof Error ? e.message : "Failed" }); }
    finally { setClearing(false); }
  };

  const healthColor = (s?: string) => ({
    HEALTHY: "text-emerald-400 border-emerald-800/50 bg-emerald-950/30",
    CRITICAL: "text-red-400 border-red-800/50 bg-red-950/30",
    WARNING: "text-amber-400 border-amber-800/50 bg-amber-950/30",
    CAUTION: "text-yellow-400 border-yellow-800/50 bg-yellow-950/30"
  }[s ?? ""] ?? "text-muted-foreground border-border bg-muted/20");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">System Performance</h2>
          <p className="text-xs text-muted-foreground">
            {dashboard ? `${dashboard.model} · ${dashboard.tier} tier` : "Loading…"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClearCache} disabled={clearing}>
            {clearing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
            Clear Cache
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleResetTokens} disabled={resetting}>
            {resetting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
            Reset Tokens
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Health status */}
          {dashboard && (
            <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", healthColor(dashboard.health.status))}>
              <Server className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">API Status: {dashboard.health.status}</p>
                <p className="text-xs opacity-70">Can make requests: {dashboard.health.canMakeRequest ? "Yes" : "No"}</p>
              </div>
            </div>
          )}

          {/* Response time KPIs */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Avg Total Time" value={ms(stats.queryStats?.avgTotalTime ?? 0)} icon={Clock} color="text-primary" />
              <StatCard label="Avg Retrieval" value={ms(stats.queryStats?.avgRetrievalTime ?? 0)} icon={Database} color="text-blue-400" />
              <StatCard label="Avg Generation" value={ms(stats.queryStats?.avgGenerationTime ?? 0)} icon={Sparkles} color="text-amber-400" />
              <StatCard label="Cache Hit Rate" value={stats.cacheStats?.hitRate ?? "—"} sub={`Backend: ${stats.cacheStats?.backend ?? "—"}`} icon={Zap} color="text-emerald-400" />
            </div>
          )}

          {/* Rate limits */}
          {dashboard && (
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Requests / min", data: dashboard.limits.rpm },
                { label: "Tokens / min", data: dashboard.limits.tpm },
                { label: "Requests / day", data: dashboard.limits.rpd }
              ].map(({ label, data }) => (
                <Card key={label}>
                  <CardContent className="p-5 space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {data.current.toLocaleString()}
                      <span className="text-sm text-muted-foreground font-normal"> / {data.limit.toLocaleString()}</span>
                    </p>
                    <ProgressBar value={data.current} max={data.limit} />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{pct(data.percentUsed)} used</span>
                      <span>Resets {data.resetIn}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Warnings */}
          {dashboard && dashboard.health.warnings.length > 0 && (
            <div className="space-y-2">
              {dashboard.health.warnings.map((w, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                  w.severity === "HIGH" ? "border-red-800/40 bg-red-950/20 text-red-300" : "border-amber-800/40 bg-amber-950/20 text-amber-300"
                )}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {w.message}
                </div>
              ))}
            </div>
          )}

          {/* Token optimization */}
          {dashboard && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" /> Token Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Tokens Saved", value: dashboard.optimization.totalTokensSaved.toLocaleString() },
                  { label: "% Saved", value: pct(dashboard.optimization.percentSaved) },
                  { label: "Optimization Calls", value: dashboard.optimization.optimizationCalls },
                  { label: "Avg Savings/Call", value: dashboard.optimization.averageSavingsPerCall.toFixed(0) }
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {dashboard && dashboard.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-md border border-border/40 p-3">
                    <Badge variant="secondary" className={cn(
                      "text-[10px] shrink-0 mt-0.5",
                      r.priority === "HIGH" && "bg-red-900/40 text-red-300",
                      r.priority === "MEDIUM" && "bg-amber-900/40 text-amber-300",
                      r.priority === "LOW" && "bg-emerald-900/40 text-emerald-300"
                    )}>{r.priority}</Badge>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{r.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.action}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{r.category}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Global Knowledge Base ───────────────────────────────────────────────

function GlobalKnowledgeBaseTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const [colls, setColls] = React.useState<DocCollection[]>([]);
  const [docStats, setDocStats] = React.useState<DocumentStats | null>(null);
  const [facets, setFacets] = React.useState<DocumentFacets | null>(null);
  const [recentDocs, setRecentDocs] = React.useState<DocumentRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [cl, ds, f, docs] = await Promise.allSettled([
        listCollections(),
        getDocumentStats(),
        getDocumentFacets(),
        listDocuments({ limit: 10, offset: 0 })
      ]);
      if (cl.status === "fulfilled") setColls(cl.value);
      if (ds.status === "fulfilled") setDocStats(ds.value);
      if (f.status === "fulfilled") setFacets(f.value);
      if (docs.status === "fulfilled") setRecentDocs(docs.value.documents);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Global Knowledge Base</h2>
          <p className="text-xs text-muted-foreground">Overview of all indexed knowledge across the system</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Documents" value={docStats?.totalDocuments ?? "—"} icon={FileText} color="text-blue-400" />
        <StatCard label="Total Chunks" value={docStats?.totalChunks ?? "—"} sub="Knowledge fragments" icon={Layers} color="text-violet-400" />
        <StatCard label="Collections" value={colls.length} icon={FolderOpen} color="text-amber-400" />
        <StatCard
          label="Est. Tokens"
          value={docStats?.estimatedTokens ? `${((docStats.estimatedTokens) / 1000).toFixed(0)}k` : "—"}
          sub="Indexed knowledge"
          icon={Database}
          color="text-emerald-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="h-4 w-4 text-blue-400" /> Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : !facets || facets.categories.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No categories yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {facets.categories.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-violet-400" /> Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : !facets || facets.tags.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No tags yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {facets.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Authors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" /> Authors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : !facets || facets.authors.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No authors yet</p>
            ) : (
              <div className="space-y-1.5">
                {facets.authors.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-xs">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-[9px] text-primary-foreground font-bold shrink-0">
                      {a[0]?.toUpperCase()}
                    </div>
                    <span className="truncate">{a}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collections overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-amber-400" /> Collections Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : colls.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No collections yet</p>
          ) : (
            <div className="space-y-2">
              {colls.map((col) => {
                const maxDocs = Math.max(...colls.map((c) => c.documentIds.length), 1);
                return (
                  <div key={col.collectionId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{col.name}</span>
                      <span className="text-muted-foreground">{col.documentIds.length} docs</span>
                    </div>
                    <ProgressBar value={col.documentIds.length} max={maxDocs} />
                    {col.description && <p className="text-[10px] text-muted-foreground">{col.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recently Added Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : recentDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No documents yet</p>
          ) : (
            <div className="space-y-2">
              {recentDocs.map((doc) => (
                <div key={doc.documentId} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40 transition-colors">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{doc.filename}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {niceFileType(doc)} · {doc.chunks} chunks · {formatBytes(doc.fileSize)}
                      {doc.category && ` · ${doc.category}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {fmtDate(doc.uploadDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function DocumentsTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const [rows, setRows] = React.useState<DocumentRow[]>([]);
  const [stats, setStats] = React.useState<DocumentStats | null>(null);
  const [facets, setFacets] = React.useState<DocumentFacets | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [offset, setOffset] = React.useState(0);
  const PAGE = 20;

  const [search, setSearch] = React.useState("");
  const [filterCat, setFilterCat] = React.useState("");

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [urlOpen, setUrlOpen] = React.useState(false);
  const [textOpen, setTextOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<DocumentRow | null>(null);
  const [deleteRow, setDeleteRow] = React.useState<DocumentRow | null>(null);
  const [reindexRow, setReindexRow] = React.useState<DocumentRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = React.useState<UploadMeta>({});
  const [urlInput, setUrlInput] = React.useState("");
  const [urlMeta, setUrlMeta] = React.useState<UploadMeta>({});
  const [textInput, setTextInput] = React.useState("");
  const [textTitle, setTextTitle] = React.useState("");
  const [textMeta, setTextMeta] = React.useState<UploadMeta>({});
  const [editPatch, setEditPatch] = React.useState<Partial<DocumentRow> & { tags?: string[] }>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, statsRes, facetsRes] = await Promise.allSettled([
        listDocuments({ limit: PAGE, offset, search, category: filterCat }),
        getDocumentStats(),
        getDocumentFacets()
      ]);
      if (docRes.status === "fulfilled") { setRows(docRes.value.documents); setTotal(docRes.value.total); }
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (facetsRes.status === "fulfilled") setFacets(facetsRes.value);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [offset, search, filterCat]);

  React.useEffect(() => { load().catch(() => {}); }, [load]);

  const handleDelete = async () => {
    if (!deleteRow) return;
    setBusy(true);
    try {
      await deleteDocument(deleteRow.documentId);
      push({ kind: "success", text: `Deleted "${deleteRow.filename}"` });
      setDeleteRow(null);
      load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "Delete failed" });
    } finally { setBusy(false); }
  };

  const handleReindex = async () => {
    if (!reindexRow) return;
    setBusy(true);
    try {
      const res = await reindexDocument(reindexRow.documentId, { refetch: true });
      push({ kind: "success", text: `Reindexed — ${res.chunksCreated} chunks created` });
      setReindexRow(null);
      load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "Reindex failed" });
    } finally { setBusy(false); }
  };

  const handleEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    try {
      await updateDocument(editRow.documentId, editPatch);
      push({ kind: "success", text: "Document updated" });
      setEditRow(null);
      load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally { setBusy(false); }
  };

  const handleUploadFile = async () => {
    if (!uploadFile) return;
    setBusy(true);
    try {
      const res = await uploadDocument(uploadFile, uploadMeta);
      push({ kind: "success", text: `Uploaded "${res.filename}" — ${res.chunksCreated} chunks` });
      setUploadOpen(false); setUploadFile(null); setUploadMeta({}); load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "Upload failed" });
    } finally { setBusy(false); }
  };

  const handleIngestUrl = async () => {
    if (!urlInput.trim()) return;
    setBusy(true);
    try {
      const res = await ingestUrl(urlInput.trim(), urlMeta);
      push({ kind: "success", text: `Ingested URL — ${res.chunksCreated} chunks` });
      setUrlOpen(false); setUrlInput(""); setUrlMeta({}); load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "URL ingest failed" });
    } finally { setBusy(false); }
  };

  const handleUploadText = async () => {
    if (!textInput.trim()) return;
    setBusy(true);
    try {
      const res = await uploadText(textInput, { ...textMeta, title: textTitle });
      push({ kind: "success", text: `Text ingested — ${res.chunksCreated} chunks` });
      setTextOpen(false); setTextInput(""); setTextTitle(""); setTextMeta({}); load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "Text ingest failed" });
    } finally { setBusy(false); }
  };

  const handleExport = async (row: DocumentRow) => {
    try { await exportDocument(row.documentId); push({ kind: "success", text: `Exported "${row.filename}"` }); }
    catch (e: unknown) { push({ kind: "error", text: e instanceof Error ? e.message : "Export failed" }); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Documents" value={stats?.totalDocuments ?? "—"} icon={FileText} color="text-blue-400" />
        <StatCard label="Total Chunks" value={stats?.totalChunks ?? "—"} icon={Layers} color="text-violet-400" />
        <StatCard label="Knowledge Size" value={formatBytes(stats?.totalChars ? stats.totalChars * 1.2 : null)} sub={`~${((stats?.estimatedTokens ?? 0) / 1000).toFixed(0)}k tokens`} icon={Database} color="text-amber-400" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search documents…" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} className="h-8 text-xs flex-1 min-w-[180px]" />
        {facets && facets.categories.length > 0 && (
          <select value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setOffset(0); }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
            <option value="">All categories</option>
            {facets.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div className="flex gap-1.5 ml-auto">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setUrlOpen(true)}><LinkIcon className="h-3.5 w-3.5" /> URL</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setTextOpen(true)}><FileText className="h-3.5 w-3.5" /> Text</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setUploadOpen(true)}><Upload className="h-3.5 w-3.5" /> Upload File</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">File</th>
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Chunks</th>
                <th className="px-4 py-2.5 text-left font-medium">Size</th>
                <th className="px-4 py-2.5 text-left font-medium">Category</th>
                <th className="px-4 py-2.5 text-left font-medium">Uploaded</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No documents found</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.documentId} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <span className="truncate block font-medium" title={row.filename}>{row.filename}</span>
                      {row.author && <span className="text-muted-foreground">{row.author}</span>}
                    </td>
                    <td className="px-4 py-2.5"><Badge variant="secondary" className="text-[10px]">{niceFileType(row)}</Badge></td>
                    <td className="px-4 py-2.5 tabular-nums">{row.chunks}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{formatBytes(row.fileSize)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.category ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(row.uploadDate)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit metadata" onClick={() => { setEditRow(row); setEditPatch({ filename: row.filename, category: row.category ?? "", author: row.author ?? "", description: row.description ?? "", tags: row.tags ?? [] }); }}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Reindex" onClick={() => setReindexRow(row)}><RefreshCw className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Export JSON" onClick={() => handleExport(row)}><Download className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteRow(row)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-2 text-xs text-muted-foreground">
            <span>{total} total</span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-6 text-xs" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Prev</Button>
              <span className="flex items-center px-2">{Math.floor(offset / PAGE) + 1} / {Math.ceil(total / PAGE)}</span>
              <Button variant="outline" size="sm" className="h-6 text-xs" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle><DialogDescription>PDF, DOCX, TXT, MD · Max 50 MB</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className="w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-2.5 file:py-1 file:text-xs file:text-foreground" />
            <MetaForm meta={uploadMeta} onChange={setUploadMeta} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleUploadFile} disabled={!uploadFile || busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ingest URL</DialogTitle><DialogDescription>Fetch a web page and store it as a document</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="https://example.com/article" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="text-xs" />
            <MetaForm meta={urlMeta} onChange={setUrlMeta} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUrlOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleIngestUrl} disabled={!urlInput.trim() || busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Ingest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={textOpen} onOpenChange={setTextOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Paste Text</DialogTitle><DialogDescription>Ingest raw text content as a document</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Document title (optional)" value={textTitle} onChange={(e) => setTextTitle(e.target.value)} className="text-xs" />
            <Textarea placeholder="Paste your text here…" value={textInput} onChange={(e) => setTextInput(e.target.value)} className="min-h-[140px] text-xs" />
            <MetaForm meta={textMeta} onChange={setTextMeta} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTextOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleUploadText} disabled={!textInput.trim() || busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Metadata</DialogTitle><DialogDescription className="truncate">{editRow?.filename}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Filename" value={editPatch.filename ?? ""} onChange={(e) => setEditPatch((p) => ({ ...p, filename: e.target.value }))} className="text-xs" />
            <MetaForm meta={{ category: editPatch.category ?? "", author: editPatch.author ?? "", description: editPatch.description ?? "", tags: editPatch.tags ?? [] }} onChange={(m) => setEditPatch((p) => ({ ...p, ...m }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit} disabled={busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Document?</DialogTitle><DialogDescription>This will permanently delete &quot;{deleteRow?.filename}&quot; and all {deleteRow?.chunks} chunks.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteRow(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reindexRow} onOpenChange={(o) => !o && setReindexRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reindex Document?</DialogTitle><DialogDescription>Re-chunk and re-embed &quot;{reindexRow?.filename}&quot;. Existing chunks will be replaced.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReindexRow(null)}>Cancel</Button>
            <Button size="sm" onClick={handleReindex} disabled={busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Reindex</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaForm({ meta, onChange }: { meta: UploadMeta & { title?: string }; onChange: (m: UploadMeta) => void }) {
  const tagStr = (meta.tags ?? []).join(", ");
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input placeholder="Category" value={meta.category ?? ""} onChange={(e) => onChange({ ...meta, category: e.target.value })} className="text-xs" />
      <Input placeholder="Author" value={meta.author ?? ""} onChange={(e) => onChange({ ...meta, author: e.target.value })} className="text-xs" />
      <Input placeholder="Tags (comma-separated)" value={tagStr} onChange={(e) => onChange({ ...meta, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} className="col-span-2 text-xs" />
      <Input placeholder="Description" value={meta.description ?? ""} onChange={(e) => onChange({ ...meta, description: e.target.value })} className="col-span-2 text-xs" />
    </div>
  );
}

// ─── Tab: Collections ─────────────────────────────────────────────────────────

function CollectionsTab({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const [colls, setColls] = React.useState<DocCollection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editColl, setEditColl] = React.useState<DocCollection | null>(null);
  const [deleteColl, setDeleteColl] = React.useState<DocCollection | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setColls(await listCollections());
    } catch {
      // silently ignore — table stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load().catch(() => {}); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await createCollection({ name: newName.trim(), description: newDesc.trim() });
      push({ kind: "success", text: `Collection "${newName}" created` });
      setCreateOpen(false); setNewName(""); setNewDesc(""); load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "Create failed" });
    } finally { setBusy(false); }
  };

  const handleUpdate = async () => {
    if (!editColl) return;
    setBusy(true);
    try {
      await updateCollection(editColl.collectionId, { name: editName.trim() || editColl.name, description: editDesc.trim() });
      push({ kind: "success", text: "Collection updated" });
      setEditColl(null); load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!deleteColl) return;
    setBusy(true);
    try {
      await deleteCollection(deleteColl.collectionId);
      push({ kind: "success", text: `Collection "${deleteColl.name}" deleted` });
      setDeleteColl(null); load();
    } catch (e: unknown) {
      push({ kind: "error", text: e instanceof Error ? e.message : "Delete failed" });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Collections</h2>
          <p className="text-xs text-muted-foreground">Group documents into named collections for scoped queries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="h-8 text-xs"><RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Refresh</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" /> New Collection</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : colls.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No collections yet</p>
          <Button size="sm" className="mt-4 text-xs" onClick={() => setCreateOpen(true)}>Create your first collection</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {colls.map((col) => (
            <Card key={col.collectionId} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm truncate">{col.name}</CardTitle>
                    {col.description && <CardDescription className="text-xs mt-0.5 line-clamp-2">{col.description}</CardDescription>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditColl(col); setEditName(col.name); setEditDesc(col.description ?? ""); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteColl(col)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>{col.documentIds.length} document{col.documentIds.length !== 1 ? "s" : ""}</span>
                  <span className="ml-auto">{fmtDate(col.createdAt).split(",")[0]}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {col.documentIds.slice(0, 3).map((id) => <Badge key={id} variant="secondary" className="text-[10px] max-w-[100px] truncate">{id.slice(0, 8)}…</Badge>)}
                  {col.documentIds.length > 3 && <Badge variant="secondary" className="text-[10px]">+{col.documentIds.length - 3} more</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Collection</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Collection name *" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-xs" />
            <Textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="text-xs min-h-[80px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editColl} onOpenChange={(o) => !o && setEditColl(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Collection</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Collection name" value={editName} onChange={(e) => setEditName(e.target.value)} className="text-xs" />
            <Textarea placeholder="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="text-xs min-h-[80px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditColl(null)}>Cancel</Button>
            <Button size="sm" onClick={handleUpdate} disabled={busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteColl} onOpenChange={(o) => !o && setDeleteColl(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Collection?</DialogTitle><DialogDescription>&quot;{deleteColl?.name}&quot; will be deleted. Documents inside are not removed.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteColl(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>{busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main AdminView ───────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "deep-analytics", label: "Deep Analytics", icon: BarChart3 },
  { id: "query-classifications", label: "Query Classifications", icon: Hash },
  { id: "user-engagement", label: "User Engagement", icon: ThumbsUp },
  { id: "user-management", label: "User Management", icon: Users },
  { id: "system-performance", label: "System Performance", icon: Gauge },
  { id: "global-knowledge", label: "Global Knowledge Base", icon: Globe },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "collections", label: "Collections", icon: Layers }
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminView() {
  const [tab, setTab] = React.useState<TabId>("overview");
  const { toasts, push } = useToasts();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="shrink-0 border-b border-border/60 bg-card/30 px-4">
        <div className="flex gap-0.5 overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                tab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-6">
          {tab === "overview" && <OverviewTab push={push} />}
          {tab === "deep-analytics" && <DeepAnalyticsTab push={push} />}
          {tab === "query-classifications" && <QueryClassificationsTab push={push} />}
          {tab === "user-engagement" && <UserEngagementTab push={push} />}
          {tab === "user-management" && <UserManagementTab push={push} />}
          {tab === "system-performance" && <SystemPerformanceTab push={push} />}
          {tab === "global-knowledge" && <GlobalKnowledgeBaseTab push={push} />}
          {tab === "documents" && <DocumentsTab push={push} />}
          {tab === "collections" && <CollectionsTab push={push} />}
        </div>
      </ScrollArea>

      <ToastStack toasts={toasts} />
    </div>
  );
}
