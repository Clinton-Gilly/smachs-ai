import { API_BASE_URL } from "./api";

export type DocCollection = {
  collectionId: string;
  name: string;
  description: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
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

export async function listCollections(
  signal?: AbortSignal
): Promise<DocCollection[]> {
  const res = await fetch(`${API_BASE_URL}/collections`, {
    signal,
    cache: "no-store"
  });
  return unwrap<DocCollection[]>(res);
}

export async function createCollection(body: {
  name: string;
  description?: string;
  documentIds?: string[];
}): Promise<DocCollection> {
  const res = await fetch(`${API_BASE_URL}/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return unwrap<DocCollection>(res);
}

export async function getCollection(
  collectionId: string,
  signal?: AbortSignal
): Promise<DocCollection> {
  const res = await fetch(
    `${API_BASE_URL}/collections/${encodeURIComponent(collectionId)}`,
    { signal, cache: "no-store" }
  );
  return unwrap<DocCollection>(res);
}

export async function updateCollection(
  collectionId: string,
  patch: Partial<Pick<DocCollection, "name" | "description" | "documentIds">>
): Promise<DocCollection> {
  const res = await fetch(
    `${API_BASE_URL}/collections/${encodeURIComponent(collectionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    }
  );
  return unwrap<DocCollection>(res);
}

export async function addToCollection(
  collectionId: string,
  documentIds: string[]
): Promise<DocCollection> {
  const res = await fetch(
    `${API_BASE_URL}/collections/${encodeURIComponent(collectionId)}/documents`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds })
    }
  );
  return unwrap<DocCollection>(res);
}

export async function removeFromCollection(
  collectionId: string,
  documentId: string
): Promise<DocCollection> {
  const res = await fetch(
    `${API_BASE_URL}/collections/${encodeURIComponent(
      collectionId
    )}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" }
  );
  return unwrap<DocCollection>(res);
}

export async function deleteCollection(
  collectionId: string
): Promise<{ deleted: boolean }> {
  const res = await fetch(
    `${API_BASE_URL}/collections/${encodeURIComponent(collectionId)}`,
    { method: "DELETE" }
  );
  return unwrap<{ deleted: boolean }>(res);
}
