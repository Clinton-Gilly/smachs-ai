"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Gauge,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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

// ─── helpers ────────────────────────────────────────────────────────────────

function ms(n: number) {
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(2)}s`;
}

function pct(n: number) {
  return `${Math.round(n)}%`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function truncate(s: string, max = 72) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-primary"
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn("mt-0.5 rounded-lg bg-primary/10 p-2", color.replace("text-", "bg-").replace("-foreground", "") + "/10")}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({
  value,
  max,
  color = "bg-primary"
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pctVal}%` }}
      />
    </div>
  );
}

function GaugeBar({
  label,
  current,
  limit,
  remaining,
  percentUsed,
  resetIn
}: {
  label: string;
  current: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetIn: string;
}) {
  const color =
    percentUsed >= 90
      ? "bg-destructive"
      : percentUsed >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current.toLocaleString()} / {limit.toLocaleString()}
          <span className="ml-1 opacity-60">resets {resetIn}</span>
        </span>
      </div>
      <ProgressBar value={current} max={limit} color={color} />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{pct(percentUsed)} used</span>
        <span>{remaining.toLocaleString()} remaining</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8 text-[12px] text-muted-foreground">
      {message}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <XCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" }
];

export function AnalyticsView() {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("24h");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [stats, setStats] = React.useState<AnalyticsStats | null>(null);
  const [popular, setPopular] = React.useState<PopularQuery[]>([]);
  const [slow, setSlow] = React.useState<SlowQuery[]>([]);
  const [methods, setMethods] = React.useState<RetrievalMethod[]>([]);
  const [feedback, setFeedback] = React.useState<FeedbackSummary | null>(null);
  const [issues, setIssues] = React.useState<CommonIssue[]>([]);
  const [usage, setUsage] = React.useState<UsageDashboard | null>(null);

  const [clearingCache, setClearingCache] = React.useState(false);
  const [resettingTokens, setResettingTokens] = React.useState(false);
  const [actionMsg, setActionMsg] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);

  const load = React.useCallback(
    async (tr: TimeRange) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setError(null);

      try {
        const [
          statsRes,
          popularRes,
          slowRes,
          methodsRes,
          feedbackRes,
          usageRes
        ] = await Promise.allSettled([
          getAnalyticsStats(tr, ctrl.signal),
          getPopularQueries({ limit: 10, timeRange: tr }, ctrl.signal),
          getSlowQueries({ limit: 10, threshold: 3000 }, ctrl.signal),
          getRetrievalMethods(tr, ctrl.signal),
          getFeedbackSummary(tr, ctrl.signal),
          getUsageDashboard(ctrl.signal)
        ]);

        if (ctrl.signal.aborted) return;

        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (popularRes.status === "fulfilled") setPopular(popularRes.value.queries ?? []);
        if (slowRes.status === "fulfilled") setSlow(slowRes.value.queries ?? []);
        if (methodsRes.status === "fulfilled") setMethods(methodsRes.value.methods ?? []);
        if (feedbackRes.status === "fulfilled") {
          setFeedback(feedbackRes.value.summary ?? null);
          setIssues(feedbackRes.value.commonIssues ?? []);
        }
        if (usageRes.status === "fulfilled") setUsage(usageRes.value);

        // Only show error if real network failures (not AbortError from cleanup)
        const isRealFailure = (r: PromiseSettledResult<unknown>) =>
          r.status === "rejected" && (r as PromiseRejectedResult).reason?.name !== "AbortError";

        if (isRealFailure(statsRes) && isRealFailure(usageRes)) {
          setError("Could not reach the analytics API. Is the backend running on port 5000?");
        } else if (isRealFailure(statsRes)) {
          setError("Query analytics unavailable — other data loaded successfully.");
        }
      } catch (err) {
        if (!ctrl.signal.aborted && (err as Error)?.name !== "AbortError") {
          setError((err as Error).message ?? "Failed to load analytics");
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    load(timeRange);
    return () => abortRef.current?.abort();
  }, [timeRange, load]);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await clearCache();
      setActionMsg(res.message ?? "Cache cleared");
    } catch {
      setActionMsg("Failed to clear cache");
    } finally {
      setClearingCache(false);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleResetTokens = async () => {
    setResettingTokens(true);
    try {
      const res = await resetTokenStats();
      setActionMsg(res.message ?? "Token stats reset");
    } catch {
      setActionMsg("Failed to reset token stats");
    } finally {
      setResettingTokens(false);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const qs = stats?.queryStats;
  const cs = stats?.cacheStats;
  const health = usage?.health;

  const healthColor =
    health?.status === "HEALTHY"
      ? "text-emerald-500"
      : health?.status === "CAUTION"
        ? "text-amber-400"
        : health?.status === "WARNING"
          ? "text-orange-500"
          : "text-destructive";

  const healthBg =
    health?.status === "HEALTHY"
      ? "bg-emerald-500/10 border-emerald-500/20"
      : health?.status === "CAUTION"
        ? "bg-amber-500/10 border-amber-500/20"
        : health?.status === "WARNING"
          ? "bg-orange-500/10 border-orange-500/20"
          : "bg-destructive/10 border-destructive/20";

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3 className="h-5 w-5 text-primary" />
              Analytics
            </h1>
            <p className="text-[12px] text-muted-foreground">
              RAG system performance, cache health, API usage &amp; feedback
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time range pills */}
            <div className="inline-flex items-center rounded-full border border-border bg-background/60 p-0.5 text-xs">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.value}
                  type="button"
                  onClick={() => setTimeRange(tr.value)}
                  className={cn(
                    "rounded-full px-3 py-1 transition-colors",
                    timeRange === tr.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tr.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => load(timeRange)}
              disabled={loading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={handleClearCache}
              disabled={clearingCache}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearingCache ? "Clearing…" : "Clear Cache"}
            </Button>
          </div>
        </div>

        {actionMsg && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
            {actionMsg}
          </div>
        )}

        {error && <ErrorBanner message={error} />}

        {/* No query data yet */}
        {!loading && !error && stats && stats.queryStats.totalQueries === 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">No RAG queries recorded in this period</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Query analytics are captured when you use <strong>RAG mode</strong> in the chat. Switch to RAG mode, ask questions about your documents, and metrics will appear here.
              </p>
            </div>
          </div>
        )}

        {/* ── KPI Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Total Queries"
            value={loading ? "—" : (qs?.totalQueries ?? 0).toLocaleString()}
            sub={`in last ${timeRange}`}
            icon={Activity}
            color="text-primary"
          />
          <KpiCard
            label="Avg Response"
            value={loading ? "—" : qs ? ms(qs.avgTotalTime) : "—"}
            sub="end-to-end latency"
            icon={Clock}
            color="text-violet-500"
          />
          <KpiCard
            label="Cache Hit Rate"
            value={loading ? "—" : cs?.hitRate ?? "—"}
            sub={cs ? `${cs.hits} hits · ${cs.misses} misses` : undefined}
            icon={Database}
            color="text-emerald-500"
          />
          <KpiCard
            label="Avg Rating"
            value={
              loading
                ? "—"
                : feedback?.avgRating != null
                  ? feedback.avgRating.toFixed(1) + " / 5"
                  : "—"
            }
            sub={feedback ? `${feedback.totalFeedback} responses` : undefined}
            icon={ThumbsUp}
            color="text-amber-500"
          />
        </div>

        {/* ── Performance + Cache ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Query Performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-violet-500" />
                Query Performance
              </CardTitle>
              <CardDescription className="text-[11px]">
                Average timing breakdown per query
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : qs ? (
                <>
                  {[
                    { label: "Total Time", value: qs.avgTotalTime, color: "bg-primary" },
                    { label: "Retrieval Time", value: qs.avgRetrievalTime, color: "bg-violet-500" },
                    { label: "Generation Time", value: qs.avgGenerationTime, color: "bg-amber-500" }
                  ].map((row) => (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium">{ms(row.value)}</span>
                      </div>
                      <ProgressBar
                        value={row.value}
                        max={qs.avgTotalTime || 1}
                        color={row.color}
                      />
                    </div>
                  ))}
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-dashed bg-card/40 p-3">
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">Avg Contexts Retrieved</p>
                      <p className="text-lg font-bold">{qs.avgContextsRetrieved.toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">Avg Contexts Used</p>
                      <p className="text-lg font-bold">{qs.avgContextsFinal.toFixed(1)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState message="No performance data for this period" />
              )}
            </CardContent>
          </Card>

          {/* Cache Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-emerald-500" />
                Cache Health
              </CardTitle>
              <CardDescription className="text-[11px]">
                {cs ? `Backend: ${cs.backend} · ${cs.memorySize} items in memory` : "Cache statistics"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />)}
                </div>
              ) : cs ? (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Hit Rate</span>
                      <span className="font-semibold text-emerald-500">{cs.hitRate}</span>
                    </div>
                    <ProgressBar
                      value={cs.hits}
                      max={cs.hits + cs.misses || 1}
                      color="bg-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Hits", value: cs.hits, color: "text-emerald-500" },
                      { label: "Misses", value: cs.misses, color: "text-destructive" },
                      { label: "Sets", value: cs.sets, color: "text-primary" }
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg border bg-card/40 p-3 text-center"
                      >
                        <p className={cn("text-xl font-bold", item.color)}>
                          {item.value.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border bg-card/40 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Backend:</span>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                      {cs.backend}
                    </Badge>
                    <span className="ml-auto text-muted-foreground">
                      {cs.memorySize} items cached
                    </span>
                  </div>
                </>
              ) : (
                <EmptyState message="No cache data available" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── API Usage / Rate Limits ───────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Gauge className="h-4 w-4 text-amber-500" />
                API Rate Limits
              </CardTitle>
              <CardDescription className="text-[11px]">
                {usage ? `${usage.tier} tier · ${usage.model}` : "Gemini API quota usage"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
                </div>
              ) : usage ? (
                <>
                  <GaugeBar
                    label="Requests / Minute (RPM)"
                    current={usage.limits.rpm.current}
                    limit={usage.limits.rpm.limit}
                    remaining={usage.limits.rpm.remaining}
                    percentUsed={usage.limits.rpm.percentUsed}
                    resetIn={usage.limits.rpm.resetIn}
                  />
                  <GaugeBar
                    label="Tokens / Minute (TPM)"
                    current={usage.limits.tpm.current}
                    limit={usage.limits.tpm.limit}
                    remaining={usage.limits.tpm.remaining}
                    percentUsed={usage.limits.tpm.percentUsed}
                    resetIn={usage.limits.tpm.resetIn}
                  />
                  <GaugeBar
                    label="Requests / Day (RPD)"
                    current={usage.limits.rpd.current}
                    limit={usage.limits.rpd.limit}
                    remaining={usage.limits.rpd.remaining}
                    percentUsed={usage.limits.rpd.percentUsed}
                    resetIn={usage.limits.rpd.resetIn}
                  />
                </>
              ) : (
                <EmptyState message="Usage data unavailable" />
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-primary" />
                System Health
              </CardTitle>
              <CardDescription className="text-[11px]">
                API status and active warnings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="h-20 animate-pulse rounded-lg bg-muted" />
              ) : health ? (
                <>
                  <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", healthBg)}>
                    {health.status === "HEALTHY" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className={cn("h-5 w-5 shrink-0", healthColor)} />
                    )}
                    <div>
                      <p className={cn("text-sm font-semibold", healthColor)}>{health.status}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {health.canMakeRequest ? "Requests allowed" : "Requests blocked — quota exceeded"}
                      </p>
                    </div>
                  </div>

                  {health.warnings.length > 0 ? (
                    <div className="space-y-2">
                      {health.warnings.map((w, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <div>
                            <p className="font-medium text-amber-600 dark:text-amber-400">{w.type}</p>
                            <p className="text-muted-foreground">{w.message}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "ml-auto shrink-0 text-[9px]",
                              w.severity === "HIGH" ? "border-destructive/30 text-destructive" : "border-amber-500/30 text-amber-500"
                            )}
                          >
                            {w.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed py-4 text-center text-[11px] text-muted-foreground">
                      No active warnings
                    </div>
                  )}
                </>
              ) : (
                <EmptyState message="Health data unavailable" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Token Optimization ───────────────────────────────────────── */}
        {(loading || usage) && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Token Optimization
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    How much cost the token optimizer is saving
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleResetTokens}
                  disabled={resettingTokens}
                >
                  <RotateCcw className="h-3 w-3" />
                  {resettingTokens ? "Resetting…" : "Reset Stats"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : usage ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    {
                      label: "Tokens Saved",
                      value: usage.optimization.totalTokensSaved.toLocaleString(),
                      icon: TrendingDown,
                      color: "text-emerald-500"
                    },
                    {
                      label: "% Reduction",
                      value: pct(usage.optimization.percentSaved),
                      icon: TrendingUp,
                      color: "text-primary"
                    },
                    {
                      label: "Optimizer Calls",
                      value: usage.optimization.optimizationCalls.toLocaleString(),
                      icon: Zap,
                      color: "text-violet-500"
                    },
                    {
                      label: "Avg Saved / Call",
                      value: Math.round(usage.optimization.averageSavingsPerCall).toLocaleString(),
                      icon: Sparkles,
                      color: "text-amber-500"
                    }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex flex-col gap-1 rounded-lg border bg-card/40 p-4"
                      >
                        <Icon className={cn("h-4 w-4", item.color)} />
                        <p className="text-xl font-bold">{item.value}</p>
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="Token optimization data unavailable" />
              )}

              {/* Recommendations */}
              {usage && usage.recommendations.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommendations
                  </p>
                  {usage.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border bg-card/40 px-3 py-2.5"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-0.5 shrink-0 text-[9px]",
                          rec.priority === "HIGH"
                            ? "border-destructive/30 text-destructive"
                            : rec.priority === "MEDIUM"
                              ? "border-amber-500/30 text-amber-500"
                              : "border-emerald-500/30 text-emerald-500"
                        )}
                      >
                        {rec.priority}
                      </Badge>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium">{rec.message}</p>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <ChevronRight className="h-3 w-3" />
                          {rec.action}
                        </p>
                      </div>
                      <Badge variant="subtle" className="ml-auto shrink-0 text-[9px]">
                        {rec.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Retrieval Methods ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              Retrieval Methods
            </CardTitle>
            <CardDescription className="text-[11px]">
              Performance breakdown by RAG retrieval strategy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : methods.length > 0 ? (
              <div className="space-y-2">
                {methods.map((m) => {
                  const maxCount = Math.max(...methods.map((x) => x.count), 1);
                  return (
                    <div
                      key={m.method}
                      className="flex items-center gap-4 rounded-lg border bg-card/40 px-4 py-3"
                    >
                      <div className="w-28 shrink-0">
                        <span className="text-xs font-medium capitalize">{m.method}</span>
                        <ProgressBar value={m.count} max={maxCount} color="bg-violet-500" />
                      </div>
                      <div className="grid flex-1 grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm font-semibold">{m.count.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">queries</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{ms(m.avgTime)}</p>
                          <p className="text-[10px] text-muted-foreground">avg time</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{m.avgContexts.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground">avg contexts</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No retrieval method data for this period" />
            )}
          </CardContent>
        </Card>

        {/* ── Popular Queries ──────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Popular Queries
            </CardTitle>
            <CardDescription className="text-[11px]">
              Most frequently asked questions in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : popular.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-3 font-medium text-muted-foreground">#</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground">Query</th>
                      <th className="pb-2 pr-3 text-right font-medium text-muted-foreground">Count</th>
                      <th className="pb-2 pr-3 text-right font-medium text-muted-foreground">Avg Time</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">Last Asked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {popular.map((q, i) => (
                      <tr key={i} className="group">
                        <td className="py-2.5 pr-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 pr-3 max-w-xs">
                          <span className="line-clamp-1 font-medium" title={q.query}>
                            {truncate(q.query)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold">{q.count}</td>
                        <td className="py-2.5 pr-3 text-right text-muted-foreground">{ms(q.avgTime)}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{fmtDate(q.lastQueried)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No queries recorded for this period" />
            )}
          </CardContent>
        </Card>

        {/* ── Slow Queries ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Slow Queries
            </CardTitle>
            <CardDescription className="text-[11px]">
              Queries exceeding 3 seconds — candidates for optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : slow.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-3 font-medium text-muted-foreground">Query</th>
                      <th className="pb-2 pr-3 text-right font-medium text-muted-foreground">Total</th>
                      <th className="pb-2 pr-3 text-right font-medium text-muted-foreground">Retrieval</th>
                      <th className="pb-2 pr-3 text-right font-medium text-muted-foreground">Generation</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {slow.map((q, i) => (
                      <tr key={i}>
                        <td className="py-2.5 pr-3 max-w-xs">
                          <span className="line-clamp-1 font-medium" title={q.query}>
                            {truncate(q.query)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-destructive">
                          {ms(q.totalTime)}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-muted-foreground">
                          {ms(q.retrievalTime)}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-muted-foreground">
                          {ms(q.generationTime)}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {fmtDate(q.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 py-6 text-[12px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                No slow queries — all responses under 3s
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Feedback ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ThumbsUp className="h-4 w-4 text-amber-500" />
                User Feedback
              </CardTitle>
              <CardDescription className="text-[11px]">
                Quality ratings from users in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
                </div>
              ) : feedback ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-card/40 p-3 text-center">
                      <p className="text-2xl font-bold text-amber-500">
                        {feedback.avgRating.toFixed(1)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Avg Rating / 5</p>
                    </div>
                    <div className="rounded-lg border bg-card/40 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-500">
                        {feedback.helpfulPercentage}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Helpful Rate</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Helpful</span>
                      <span className="font-medium text-emerald-500">{feedback.helpfulCount}</span>
                    </div>
                    <ProgressBar
                      value={feedback.helpfulCount}
                      max={feedback.totalFeedback || 1}
                      color="bg-emerald-500"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Not Helpful</span>
                      <span className="font-medium text-destructive">{feedback.notHelpfulCount}</span>
                    </div>
                    <ProgressBar
                      value={feedback.notHelpfulCount}
                      max={feedback.totalFeedback || 1}
                      color="bg-destructive"
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    {feedback.totalFeedback} total responses
                  </p>
                </>
              ) : (
                <EmptyState message="No feedback data for this period" />
              )}
            </CardContent>
          </Card>

          {/* Common Issues */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Common Issues
              </CardTitle>
              <CardDescription className="text-[11px]">
                Most reported problem types from user feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />)}
                </div>
              ) : issues.length > 0 ? (
                <div className="space-y-2">
                  {issues.map((issue, i) => {
                    const maxCount = Math.max(...issues.map((x) => x.count), 1);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium capitalize">{issue.issue}</span>
                          <span className="text-muted-foreground">{issue.count}</span>
                        </div>
                        <ProgressBar value={issue.count} max={maxCount} color="bg-orange-500" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 py-6 text-[12px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  No issues reported
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </ScrollArea>
  );
}
