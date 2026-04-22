"use client";

import * as React from "react";
import type { ChatMessage } from "@/components/chat/message";

export type ChatMode = "general" | "coanony" | "rag";

export type ScopedDocument = {
  documentId: string;
  filename: string;
  totalPages?: number | null;
};

export type ScopedCollection = {
  collectionId: string;
  name: string;
  documentCount?: number;
};

export type ChatThread = {
  id: string;
  title: string;
  mode: ChatMode;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  scopedDocument?: ScopedDocument;
  scopedCollection?: ScopedCollection;
};

const STORAGE_KEY_PREFIX = "smachs.threads.v1";
const EVENT = "smachs:threads-changed";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function storageKey(): string {
  if (typeof window === "undefined") return STORAGE_KEY_PREFIX;
  try {
    const raw = window.localStorage.getItem("smachs_user");
    if (raw) {
      const user = JSON.parse(raw);
      if (user?._id) return `${STORAGE_KEY_PREFIX}.${user._id}`;
    }
  } catch { /* ignore */ }
  return STORAGE_KEY_PREFIX;
}

function read(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(threads));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export const threadsStore = {
  list(): ChatThread[] {
    return read().sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): ChatThread | undefined {
    return read().find((t) => t.id === id);
  },
  upsert(thread: ChatThread) {
    const all = read();
    const idx = all.findIndex((t) => t.id === thread.id);
    if (idx === -1) all.push(thread);
    else all[idx] = thread;
    write(all);
  },
  update(id: string, patch: Partial<ChatThread>) {
    const all = read();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
    write(all);
  },
  rename(id: string, title: string) {
    this.update(id, { title });
  },
  toggleArchive(id: string) {
    const t = this.get(id);
    if (!t) return;
    this.update(id, { archived: !t.archived });
  },
  remove(id: string) {
    write(read().filter((t) => t.id !== id));
  },
  create(mode: ChatMode, extras: Partial<ChatThread> = {}): ChatThread {
    const t: ChatThread = {
      id: uid(),
      title: "New chat",
      mode,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...extras
    };
    this.upsert(t);
    return t;
  }
};

export function useThreads(): ChatThread[] {
  // Always start empty so SSR and first client render match; real data hydrates in useEffect.
  const [threads, setThreads] = React.useState<ChatThread[]>([]);

  React.useEffect(() => {
    const sync = () => setThreads(threadsStore.list());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return threads;
}

export function useThread(id: string | null): ChatThread | null {
  const [thread, setThread] = React.useState<ChatThread | null>(null);

  React.useEffect(() => {
    const sync = () =>
      setThread(id ? threadsStore.get(id) ?? null : null);
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  return thread;
}

export function deriveTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New chat";
  return trimmed.length > 48 ? trimmed.slice(0, 45) + "..." : trimmed;
}
