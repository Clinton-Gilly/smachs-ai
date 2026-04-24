import { API_BASE_URL } from "./api";
import { authHeaders } from "./auth";

export type TimeRange = "1h" | "24h" | "7d" | "30d";

export type QueryStats = {
  totalQueries: number;
  avgTotalTime: number;
  avgRetrievalTime: number;
  avgGenerationTime: number;
  avgContextsRetrieved: number;
  avgContextsFinal: number;
};

export type CacheStats = {
  hits: number;
  misses: number;
  sets: number;
  hitRate: string;
  backend: string;
  memorySize: number;
};

export type AnalyticsStats = {
  timeRange: string;
  queryStats: QueryStats;
  cacheStats: CacheStats;
};

export type PopularQuery = {
  query: string;
  count: number;
  avgTime: number;
  lastQueried: string;
};

export type SlowQuery = {
  query: string;
  totalTime: number;
  retrievalTime: number;
  generationTime: number;
  timestamp: string;
};

export type RetrievalMethod = {
  method: string;
  count: number;
  avgTime: number;
  avgContexts: number;
};

export type FeedbackSummary = {
  totalFeedback: number;
  avgRating: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulPercentage: string;
};

export type CommonIssue = {
  issue: string;
  count: number;
};

export type RateLimitTier = {
  requests: number;
  requestsLimit: number;
  requestsRemaining: number;
  tokens?: number;
  tokensLimit?: number;
  tokensRemaining?: number;
  resetTime: number;
};

export type UsageStats = {
  rateLimit: {
    minute: RateLimitTier;
    day: RateLimitTier;
    percentageUsed: { rpm: number; tpm: number; rpd: number };
  };
  tokenOptimization: {
    totalTokensSaved: number;
    percentSaved: number;
    optimizationCalls: number;
    averageSavingsPerCall: number;
  };
  recommendations: {
    priority: "HIGH" | "MEDIUM" | "LOW";
    category: string;
    message: string;
    action: string;
  }[];
};

export type HealthWarning = {
  type: string;
  message: string;
  severity: "HIGH" | "MEDIUM";
};

export type UsageDashboard = {
  tier: string;
  model: string;
  limits: {
    rpm: { current: number; limit: number; remaining: number; percentUsed: number; resetIn: string };
    tpm: { current: number; limit: number; remaining: number; percentUsed: number; resetIn: string };
    rpd: { current: number; limit: number; remaining: number; percentUsed: number; resetIn: string };
  };
  optimization: {
    totalTokensSaved: number;
    percentSaved: number;
    optimizationCalls: number;
    averageSavingsPerCall: number;
  };
  health: {
    status: "HEALTHY" | "CAUTION" | "WARNING" | "CRITICAL";
    warnings: HealthWarning[];
    canMakeRequest: boolean;
  };
  recommendations: UsageStats["recommendations"];
};

async function unwrap<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || body?.error || body?.message || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  if (body?.success === false) {
    const msg = body?.error?.message || body?.error || body?.message || "Request returned success: false";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  // Support both { data: ... } and flat response shapes
  if ("data" in body && body.data !== undefined && body.data !== null) return body.data as T;
  return body as T;
}

export async function getAnalyticsStats(
  timeRange: TimeRange = "24h",
  signal?: AbortSignal
): Promise<AnalyticsStats> {
  const res = await fetch(`${API_BASE_URL}/analytics/stats?timeRange=${timeRange}`, {
    headers: { ...authHeaders() },
    signal,
    cache: "no-store"
  });
  return unwrap<AnalyticsStats>(res);
}

export async function getPopularQueries(
  params: { limit?: number; timeRange?: TimeRange } = {},
  signal?: AbortSignal
): Promise<{ queries: PopularQuery[] }> {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.timeRange) q.set("timeRange", params.timeRange);
  const res = await fetch(`${API_BASE_URL}/analytics/popular?${q}`, {
    headers: { ...authHeaders() },
    signal,
    cache: "no-store"
  });
  return unwrap<{ queries: PopularQuery[] }>(res);
}

export async function getSlowQueries(
  params: { limit?: number; threshold?: number } = {},
  signal?: AbortSignal
): Promise<{ queries: SlowQuery[] }> {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.threshold) q.set("threshold", String(params.threshold));
  const res = await fetch(`${API_BASE_URL}/analytics/slow?${q}`, {
    headers: { ...authHeaders() },
    signal,
    cache: "no-store"
  });
  return unwrap<{ queries: SlowQuery[] }>(res);
}

export async function getRetrievalMethods(
  timeRange: TimeRange = "7d",
  signal?: AbortSignal
): Promise<{ methods: RetrievalMethod[] }> {
  const res = await fetch(`${API_BASE_URL}/analytics/methods?timeRange=${timeRange}`, {
    headers: { ...authHeaders() },
    signal,
    cache: "no-store"
  });
  return unwrap<{ methods: RetrievalMethod[] }>(res);
}

export async function getFeedbackSummary(
  timeRange: TimeRange = "7d",
  signal?: AbortSignal
): Promise<{ summary: FeedbackSummary; commonIssues: CommonIssue[] }> {
  const res = await fetch(`${API_BASE_URL}/analytics/feedback/summary?timeRange=${timeRange}`, {
    headers: { ...authHeaders() },
    signal,
    cache: "no-store"
  });
  return unwrap<{ summary: FeedbackSummary; commonIssues: CommonIssue[] }>(res);
}

export async function clearCache(signal?: AbortSignal): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/analytics/cache/clear`, {
    method: "POST",
    headers: { ...authHeaders() },
    signal
  });
  return unwrap<{ message: string }>(res);
}

export type GlobalKBStats = {
  totalQueries: number;
  avgResponseTime: number;
  avgContextsRetrieved: number;
  topQueries: { query: string; count: number; lastQueried: string; avgTime: number }[];
};

export async function getGlobalKBStats(
  timeRange: TimeRange = "7d",
  signal?: AbortSignal
): Promise<GlobalKBStats> {
  const res = await fetch(`${API_BASE_URL}/analytics/global-kb?timeRange=${timeRange}`, {
    headers: { ...authHeaders() },
    signal,
    cache: "no-store"
  });
  return unwrap<GlobalKBStats>(res);
}

export async function getUsageDashboard(signal?: AbortSignal): Promise<UsageDashboard> {
  const res = await fetch(`${API_BASE_URL}/usage/dashboard`, {
    headers: { ...authHeaders() },
    signal,
    cache: "no-store"
  });
  return unwrap<UsageDashboard>(res);
}

export async function resetTokenStats(signal?: AbortSignal): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/usage/reset-token-stats`, {
    method: "POST",
    headers: { ...authHeaders() },
    signal
  });
  return unwrap<{ message: string }>(res);
}
