import { API_BASE_URL, QueryOptions, RetrievedContext } from "./api";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type StreamEvent =
  | { type: "step"; step: string; message?: string; data?: unknown }
  | { type: "start"; query: string; contextsCount: number; timestamp: string }
  | { type: "context"; contexts: RetrievedContext[] }
  | { type: "chunk"; text: string; chunkIndex: number }
  | {
      type: "complete";
      fullResponse: string;
      totalChunks: number;
      timestamp: string;
    }
  | { type: "error"; message: string };

type Handlers = {
  onEvent?: (ev: StreamEvent) => void;
  onChunk?: (text: string) => void;
  onContext?: (ctx: RetrievedContext[]) => void;
  onComplete?: (full: string) => void;
  onError?: (message: string) => void;
  onStep?: (step: string, message?: string) => void;
};

/**
 * Streams SSE from POST /api/query/stream by reading the response body
 * and parsing `event:` / `data:` frames manually (fetch streaming, no EventSource).
 */
export async function streamQuery(
  query: string,
  options: QueryOptions = {},
  handlers: Handlers = {},
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/query/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify({ query, options }),
    signal
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stream request failed (${res.status}) ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const dispatch = (eventName: string, dataRaw: string) => {
    let data: unknown = dataRaw;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      /* keep as string */
    }

    const payload = (data ?? {}) as Record<string, unknown>;
    const ev = { type: eventName, ...payload } as StreamEvent;
    handlers.onEvent?.(ev);

    switch (eventName) {
      case "chunk": {
        const text = (payload.text as string) ?? "";
        fullText += text;
        handlers.onChunk?.(text);
        break;
      }
      case "context":
        handlers.onContext?.((payload.contexts as RetrievedContext[]) ?? []);
        break;
      case "step":
        handlers.onStep?.(
          (payload.step as string) ?? "",
          payload.message as string | undefined
        );
        break;
      case "complete":
        handlers.onComplete?.(
          ((payload.fullResponse as string) ?? fullText) || fullText
        );
        break;
      case "error":
        handlers.onError?.((payload.message as string) ?? "Unknown error");
        break;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) dispatch(eventName, dataLines.join("\n"));
    }
  }

  return fullText;
}

/**
 * Plain chat streaming (no RAG retrieval) against POST /api/chat/stream.
 * Sends the full conversation so the assistant has context.
 */
export async function streamChat(
  messages: ChatTurn[],
  options: { system?: string; temperature?: number } = {},
  handlers: Pick<Handlers, "onChunk" | "onComplete" | "onError"> = {},
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify({ messages, options }),
    signal
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chat stream failed (${res.status}) ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;

      let data: any = dataLines.join("\n");
      try {
        data = JSON.parse(data);
      } catch {
        /* keep raw */
      }

      if (eventName === "chunk") {
        const text = (data?.text as string) ?? "";
        full += text;
        handlers.onChunk?.(text);
      } else if (eventName === "complete") {
        handlers.onComplete?.((data?.fullResponse as string) ?? full);
      } else if (eventName === "error") {
        handlers.onError?.((data?.message as string) ?? "Error");
      }
    }
  }

  return full;
}
