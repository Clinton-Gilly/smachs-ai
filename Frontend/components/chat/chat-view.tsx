"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, X } from "lucide-react";
import { Welcome } from "./welcome";
import { MessageBubble, type ChatMessage } from "./message";
import { Composer, type ComposerMode } from "./composer";
import { streamChat, streamQuery, type ChatTurn } from "@/lib/stream";
import {
  threadsStore,
  useThread,
  type ChatThread
} from "@/lib/threads";
import { uploadDocument } from "@/lib/documents";
import { createCollection } from "@/lib/collections";
import { Button } from "@/components/ui/button";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function generateChatTitle(
  userMsg: string,
  assistantMsg: string
): Promise<string> {
  let title = "";
  try {
    await streamChat(
      [
        { role: "user", content: userMsg },
        { role: "assistant", content: assistantMsg }
      ],
      {
        system:
          "Generate a short 3-6 word title for this conversation. Output ONLY the title — no quotes, no punctuation at the end, no extra text."
      },
      { onChunk: (t) => { title += t; } }
    );
  } catch {
    // fall through to fallback
  }
  const clean = title.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  return clean || userMsg.trim().slice(0, 45);
}

export function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");
  const newParam = searchParams.get("new");

  const [activeId, setActiveId] = React.useState<string | null>(idFromUrl);

  React.useEffect(() => {
    setActiveId(idFromUrl);
  }, [idFromUrl]);

  const thread = useThread(activeId);

  const [input, setInput] = React.useState("");
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);
  const [mode, setMode] = React.useState<ComposerMode>(() => {
    if (thread) return thread.mode as ComposerMode;
    if (newParam === "rag") return "rag";
    if (newParam === "coanony") return "coanony";
    return "general";
  });
  const [ragDocIds, setRagDocIds] = React.useState<string[]>([]);
  const [streaming, setStreaming] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (thread) setMode(thread.mode as ComposerMode);
  }, [thread?.id, thread?.mode]);

  const scrollToBottom = React.useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    });
  }, []);

  const messages = thread?.messages ?? [];

  React.useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const persist = (patch: Partial<ChatThread>) => {
    if (!activeId) return;
    threadsStore.update(activeId, patch);
  };

  const setMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    if (!activeId) return;
    const current = threadsStore.get(activeId);
    if (!current) return;
    persist({ messages: updater(current.messages) });
  };

  const ensureThread = (): ChatThread => {
    if (thread) return thread;
    const created = threadsStore.create(mode);
    router.replace(`/chat?id=${created.id}`);
    setActiveId(created.id);
    return created;
  };

  const handleSend = async () => {
    const query = input.trim();
    const filesToUpload = [...attachedFiles];
    const hasFiles = filesToUpload.length > 0;
    if (!query && !hasFiles) return;

    const t = ensureThread();
    const threadId = t.id;
    const assistantId = uid();
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: query || `Please analyze the attached file${filesToUpload.length > 1 ? "s" : ""}.`,
      attachments: hasFiles ? filesToUpload.map((f) => ({ filename: f.name })) : undefined
    };
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
      steps: hasFiles ? [{ step: "uploading", message: `Uploading ${filesToUpload.length} file${filesToUpload.length > 1 ? "s" : ""}…` }] : []
    };

    const nextMessages = [...t.messages, userMsg, assistantMsg];
    threadsStore.update(threadId, {
      messages: nextMessages,
      title: t.title,
      mode
    });

    // Bind message updates to the concrete thread id — `activeId` state may
    // still be null in this closure if the thread was just created this tick.
    const mutate = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      const current = threadsStore.get(threadId);
      if (!current) return;
      threadsStore.update(threadId, { messages: updater(current.messages) });
    };
    const appendChunkLocal = (id: string, text: string) =>
      mutate((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: (m.content ?? "") + text } : m
        )
      );
    const updateAssistantLocal = (id: string, patch: Partial<ChatMessage>) =>
      mutate((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    const appendStepLocal = (id: string, step: string, message?: string) =>
      mutate((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, steps: [...(m.steps ?? []), { step, message }] }
            : m
        )
      );

    // --- Typewriter pacing --------------------------------------------------
    // Network chunks can arrive in bursts (several words at once). We buffer
    // them and drip the text into the bubble a few characters per tick so the
    // response animates like real typing regardless of upstream chunk size.
    let pending = "";
    let completed = false;
    let ticker: ReturnType<typeof setInterval> | null = null;

    const stopTicker = () => {
      if (ticker !== null) {
        clearInterval(ticker);
        ticker = null;
      }
    };

    const drainTick = () => {
      if (pending.length > 0) {
        // Adaptive burst: if the buffer is big, speed up so the user isn't
        // stuck watching a slow typewriter after the network is done.
        const burst =
          pending.length > 600
            ? 12
            : pending.length > 200
              ? 5
              : pending.length > 60
                ? 3
                : 2;
        const n = Math.min(burst, pending.length);
        appendChunkLocal(assistantId, pending.slice(0, n));
        pending = pending.slice(n);
      }
      if (pending.length === 0 && completed) {
        updateAssistantLocal(assistantId, { streaming: false });
        stopTicker();
      }
    };

    const startTicker = () => {
      if (ticker === null) ticker = setInterval(drainTick, 18);
    };

    const waitForDrain = () =>
      new Promise<void>((resolve) => {
        const check = () => {
          if (pending.length === 0 && ticker === null) resolve();
          else setTimeout(check, 24);
        };
        check();
      });

    setInput("");
    setAttachedFiles([]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Upload any attached files and collect their document IDs for RAG scoping
    let uploadedDocIds: string[] = [];
    if (hasFiles) {
      try {
        for (const file of filesToUpload) {
          const result = await uploadDocument(file, {}, controller.signal);
          uploadedDocIds.push(result.documentId);
        }
        updateAssistantLocal(assistantId, {
          steps: [{ step: "indexed", message: `${uploadedDocIds.length} file${uploadedDocIds.length > 1 ? "s" : ""} indexed — searching…` }]
        });
      } catch (err) {
        stopTicker();
        if ((err as Error)?.name !== "AbortError") {
          updateAssistantLocal(assistantId, {
            error: "Failed to upload file(s): " + (err instanceof Error ? err.message : "Unknown error"),
            streaming: false
          });
        } else {
          updateAssistantLocal(assistantId, { streaming: false });
        }
        setStreaming(false);
        abortRef.current = null;
        return;
      }
    }

    try {
      if (!hasFiles && mode === "general") {
        // ── General mode: plain AI chat, no knowledge base ──────────────────
        const history: ChatTurn[] = nextMessages
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content }));

        const system = [
          "You are Smachs AI — a warm, sharp, general-purpose assistant built by Smachs. Your identity is Smachs AI. You are NOT Gemini, NOT Google, NOT Bard, NOT any other model. If asked what you are, who made you, or what model powers you, say you are Smachs AI built by the Smachs team. Never mention Google, Gemini, Bard, or any underlying provider.",
          "Engage naturally. Answer questions across any topic — coding, writing, math, science, history, current concepts, planning, creative work, casual chat — directly and confidently. Don't over-qualify. Don't preface answers with disclaimers about being an AI. Just answer.",
          "Only say you don't know when you genuinely don't know. For live data (today's news, current prices, real-time sports scores), explain you don't have live internet access but offer what you can help with instead — don't just refuse.",
          "Tone: friendly, curious, a little playful when appropriate. Keep replies concise by default but go deeper when the question deserves it. Use markdown (code blocks, lists, headings) when it helps readability.",
          "When the user asks something casual like 'what are you doing' or 'how are you', respond conversationally and humanly — not with a mechanical self-description."
        ].join("\n\n");

        await streamChat(
          history,
          { system },
          {
            onChunk: (text) => { pending += text; startTicker(); },
            onComplete: () => { completed = true; startTicker(); },
            onError: (msg) => {
              stopTicker();
              updateAssistantLocal(assistantId, { error: msg, streaming: false });
            }
          },
          controller.signal
        );
        await waitForDrain();
        if (t.messages.length === 0) {
          const assistantContent =
            threadsStore.get(threadId)?.messages.find((m) => m.id === assistantId)?.content ?? "";
          if (assistantContent) {
            generateChatTitle(query, assistantContent)
              .then((title) => { if (title) threadsStore.rename(threadId, title); })
              .catch(() => {});
          }
        }
      } else {
        // ── Company mode: query global (admin) knowledge base only ───────────
        // ── Knowledge mode: query user's own documents only ──────────────────
        // ── Either mode with file uploads: scope to uploaded files ───────────

        const scopeOpts: Record<string, unknown> = {};

        if (uploadedDocIds.length === 1) {
          scopeOpts.documentId = uploadedDocIds[0];
        } else if (uploadedDocIds.length > 1) {
          const col = await createCollection({
            name: `chat-upload-${Date.now()}`,
            documentIds: uploadedDocIds
          });
          scopeOpts.collectionId = col.collectionId;
        } else if (mode === "coanony") {
          // Company mode → only global knowledge base docs
          scopeOpts.metadataFilter = { isGlobal: true };
        } else if (t.scopedDocument) {
          scopeOpts.documentId = t.scopedDocument.documentId;
        } else if (t.scopedCollection) {
          scopeOpts.collectionId = t.scopedCollection.collectionId;
        } else if (ragDocIds.length === 1) {
          scopeOpts.documentId = ragDocIds[0];
        } else if (ragDocIds.length > 1) {
          const col = await createCollection({
            name: `rag-selection-${Date.now()}`,
            documentIds: ragDocIds
          });
          scopeOpts.collectionId = col.collectionId;
        }

        const ragQuery = userMsg.content;
        await streamQuery(
          ragQuery,
          scopeOpts,
          {
            onStep: (step, message) =>
              appendStepLocal(assistantId, step, message),
            onContext: (ctx) =>
              updateAssistantLocal(assistantId, { contexts: ctx }),
            onChunk: (text) => {
              pending += text;
              startTicker();
            },
            onComplete: () => {
              completed = true;
              startTicker();
            },
            onError: (msg) => {
              stopTicker();
              updateAssistantLocal(assistantId, {
                error: msg,
                streaming: false
              });
            }
          },
          controller.signal
        );
        await waitForDrain();
        if (t.messages.length === 0) {
          const assistantContent =
            threadsStore.get(threadId)?.messages.find((m) => m.id === assistantId)?.content ?? "";
          if (assistantContent) {
            generateChatTitle(ragQuery, assistantContent)
              .then((title) => { if (title) threadsStore.rename(threadId, title); })
              .catch(() => {});
          }
        }
      }
    } catch (err) {
      stopTicker();
      if ((err as Error)?.name === "AbortError") {
        updateAssistantLocal(assistantId, { streaming: false });
      } else {
        const raw =
          err instanceof Error
            ? err.message
            : "Request failed.";
        const hint =
          /Failed to fetch|NetworkError|ECONNREFUSED/i.test(raw) ||
          /\b404\b/.test(raw)
            ? " — is the backend running on port 5000 with the latest /api/chat/stream route? Try restarting it (npm run dev)."
            : "";
        updateAssistantLocal(assistantId, {
          error: raw + hint,
          streaming: false
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      mutate((prev) =>
        prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
      );
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
  };

  const pickPrompt = (p: string) => setInput(p);

  const scopedDoc = thread?.scopedDocument;
  const scopedCol = thread?.scopedCollection;

  return (
    <div className="flex h-full flex-col">
      {scopedDoc && (
        <div className="border-b border-border bg-primary/5 px-4 py-2.5 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium text-foreground">
                Chatting with{" "}
                <span className="text-primary">{scopedDoc.filename}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                Answers are sourced only from this document
                {scopedDoc.totalPages
                  ? ` · ${scopedDoc.totalPages} pages`
                  : ""}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              aria-label="Leave document scope"
              title="Chat without this document"
              onClick={() => {
                if (!activeId) return;
                threadsStore.update(activeId, { scopedDocument: undefined });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      {scopedCol && !scopedDoc && (
        <div className="border-b border-border bg-primary/5 px-4 py-2.5 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium text-foreground">
                Chatting with collection{" "}
                <span className="text-primary">{scopedCol.name}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                Retrieval is scoped to{" "}
                {scopedCol.documentCount ?? "these"} documents
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              aria-label="Leave collection scope"
              title="Chat without this collection"
              onClick={() => {
                if (!activeId) return;
                threadsStore.update(activeId, { scopedCollection: undefined });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin gradient-mesh"
      >
        {messages.length === 0 ? (
          <Welcome
            onPickPrompt={pickPrompt}
            scopedFilename={scopedDoc?.filename}
            mode={mode}
            ragDocIds={ragDocIds}
            onRagDocIdsChange={setRagDocIds}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/60 backdrop-blur">
        <Composer
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={handleStop}
          streaming={streaming}
          disabled={streaming}
          mode={mode}
          onModeChange={(m) => {
            setMode(m);
            if (thread) persist({ mode: m });
          }}
          attachedFiles={attachedFiles}
          onFilesChange={setAttachedFiles}
          ragDocIds={ragDocIds}
          onRagDocIdsChange={setRagDocIds}
        />
      </div>
    </div>
  );
}
