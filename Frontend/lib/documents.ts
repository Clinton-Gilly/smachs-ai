import { API_BASE_URL } from "./api";

export type DocumentRow = {
  documentId: string;
  filename: string;
  fileType: string | null;
  fileSize: number | null;
  chunks: number;
  totalChars: number;
  totalPages: number | null;
  uploadDate: string | null;
  category: string | null;
  author: string | null;
  tags: string[];
  description: string | null;
  source: string | null;
  sourceUrl?: string | null;
  embeddingModel?: string | null;
  lastRetrievedAt?: string | null;
  reindexedAt?: string | null;
};

export type DocumentListResponse = {
  total: number;
  offset: number;
  limit: number;
  documents: DocumentRow[];
};

export type DocumentChunkPreview = {
  chunkId: string;
  content: string;
  charCount: number;
};

export type DocumentDetail = DocumentRow & {
  totalChunks: number;
  chunks: DocumentChunkPreview[];
};

export type DocumentStats = {
  totalChunks: number;
  totalDocuments: number;
  totalChars?: number;
  estimatedTokens?: number;
  embeddingModels?: string[];
  lastUpload?: string | null;
  lastRetrievedAt?: string | null;
};

export type DocumentFacets = {
  categories: string[];
  authors: string[];
  tags: string[];
};

export type ListDocumentsParams = {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  author?: string;
  tag?: string;
  collectionId?: string;
};

async function unwrap<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const msg =
      body?.error?.message ||
      body?.error ||
      body?.message ||
      `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return (body?.data ?? body) as T;
}

export async function listDocuments(
  params: ListDocumentsParams = {},
  signal?: AbortSignal
): Promise<DocumentListResponse> {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.author) q.set("author", params.author);
  if (params.tag) q.set("tag", params.tag);
  if (params.collectionId) q.set("collectionId", params.collectionId);
  const suffix = q.toString() ? `?${q}` : "";
  const res = await fetch(`${API_BASE_URL}/documents${suffix}`, {
    signal,
    cache: "no-store"
  });
  return unwrap<DocumentListResponse>(res);
}

export async function getDocumentFacets(
  signal?: AbortSignal
): Promise<DocumentFacets> {
  const res = await fetch(`${API_BASE_URL}/documents/facets`, {
    signal,
    cache: "no-store"
  });
  return unwrap<DocumentFacets>(res);
}

export async function getDocumentStats(
  signal?: AbortSignal
): Promise<DocumentStats> {
  const res = await fetch(`${API_BASE_URL}/documents/stats`, {
    signal,
    cache: "no-store"
  });
  return unwrap<DocumentStats>(res);
}

export async function getDocument(
  documentId: string,
  chunkLimit = 20,
  signal?: AbortSignal
): Promise<DocumentDetail> {
  const res = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}?chunkLimit=${chunkLimit}`,
    { signal, cache: "no-store" }
  );
  return unwrap<DocumentDetail>(res);
}

export async function deleteDocument(
  documentId: string
): Promise<{ documentId: string }> {
  const res = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" }
  );
  return unwrap<{ documentId: string }>(res);
}

export type UploadMeta = {
  category?: string;
  author?: string;
  tags?: string[];
  description?: string;
};

export async function uploadDocument(
  file: File,
  meta: UploadMeta = {},
  signal?: AbortSignal
): Promise<{
  documentId: string;
  filename: string;
  chunksCreated: number;
}> {
  const form = new FormData();
  form.append("file", file);
  if (meta.category) form.append("category", meta.category);
  if (meta.author) form.append("author", meta.author);
  if (meta.description) form.append("description", meta.description);
  if (meta.tags && meta.tags.length)
    form.append("tags", JSON.stringify(meta.tags));

  const res = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    body: form,
    signal
  });
  return unwrap<{
    documentId: string;
    filename: string;
    chunksCreated: number;
  }>(res);
}

export async function ingestUrl(
  url: string,
  meta: UploadMeta = {},
  signal?: AbortSignal
): Promise<{ documentId: string; chunksCreated: number }> {
  const res = await fetch(`${API_BASE_URL}/documents/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      metadata: {
        category: meta.category,
        author: meta.author,
        description: meta.description,
        tags: meta.tags ?? []
      }
    }),
    signal
  });
  return unwrap<{ documentId: string; chunksCreated: number }>(res);
}

export async function updateDocument(
  documentId: string,
  patch: Partial<
    Pick<DocumentRow, "filename" | "category" | "author" | "description">
  > & { tags?: string[] }
): Promise<DocumentDetail> {
  const res = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    }
  );
  return unwrap<DocumentDetail>(res);
}

export async function reindexDocument(
  documentId: string,
  body: { text?: string; refetch?: boolean } = {}
): Promise<{ documentId: string; chunksCreated: number }> {
  const res = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/reindex`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  return unwrap<{ documentId: string; chunksCreated: number }>(res);
}

export async function exportDocument(documentId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/export`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const json = await res.json();
  const blob = new Blob([JSON.stringify(json.data ?? json, null, 2)], {
    type: "application/json"
  });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `document-${documentId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export async function uploadText(
  text: string,
  meta: UploadMeta & { title?: string } = {},
  signal?: AbortSignal
): Promise<{ documentId: string; chunksCreated: number }> {
  const res = await fetch(`${API_BASE_URL}/documents/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      metadata: {
        filename: meta.title,
        category: meta.category,
        author: meta.author,
        description: meta.description,
        tags: meta.tags ?? []
      }
    }),
    signal
  });
  return unwrap<{ documentId: string; chunksCreated: number }>(res);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

export function niceFileType(row: Pick<DocumentRow, "fileType" | "source">) {
  if (row.source === "direct_text") return "Text";
  if (!row.fileType) return "File";
  if (row.fileType.includes("pdf")) return "PDF";
  if (row.fileType.includes("wordprocessingml")) return "DOCX";
  if (row.fileType.includes("markdown")) return "Markdown";
  if (row.fileType.startsWith("text/")) return "Text";
  return row.fileType.split("/")[1]?.toUpperCase() ?? "File";
}
