import { authHeaders } from "./auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "/api";

export type QueryOptions = {
  useQueryRewriting?: boolean;
  useQueryExpansion?: boolean;
  useQueryDecomposition?: boolean;
  useHybridSearch?: boolean;
  useReranking?: boolean;
  useContextCompression?: boolean;
  useCoT?: boolean;
  topK?: number;
  rerankTopK?: number;
  metadataFilter?: Record<string, unknown>;
  documentId?: string | null;
  collectionId?: string | null;
};

export type RetrievedContext = {
  content: string;
  score?: number;
  index?: number;
  filename?: string | null;
  page?: number | null;
  chunkIndex?: number | null;
  documentId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function fetchHealth(signal?: AbortSignal) {
  const res = await fetch(`${API_BASE_URL}/health`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export async function simpleQuery(query: string, topK = 5, signal?: AbortSignal) {
  const res = await fetch(`${API_BASE_URL}/query/simple`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ query, topK }),
    signal
  });
  if (!res.ok) throw new Error(`Query failed (${res.status})`);
  return res.json();
}

export async function submitFeedback(payload: {
  queryId?: string;
  query?: string;
  rating: "positive" | "negative";
  comment?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/analytics/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Feedback failed (${res.status})`);
  return res.json();
}
