"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Copy,
  ThumbsDown,
  ThumbsUp,
  User,
  Brain,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RetrievedContext } from "@/lib/api";

const CITE_RE = /\[S(\d+)(?:\s*(?:p(?:age)?\.?|pg\.?)\s*(\d+))?\]/gi;

function CitationChip({
  number,
  page,
  ctx
}: {
  number: number;
  page?: number;
  ctx?: RetrievedContext;
}) {
  const filename = ctx?.filename ?? undefined;
  const ctxPage = page ?? ctx?.page ?? undefined;
  const tip = [
    filename ? filename : `Source ${number}`,
    ctxPage != null ? `page ${ctxPage}` : null
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <sup
      title={tip}
      className="mx-0.5 inline-flex cursor-help items-baseline rounded-md border border-primary/30 bg-primary/10 px-1 py-0 text-[10px] font-semibold tracking-tight text-primary align-super"
    >
      S{number}
      {ctxPage != null && <span className="ml-0.5 opacity-80">p.{ctxPage}</span>}
    </sup>
  );
}

function transformCitations(
  children: React.ReactNode,
  contexts?: RetrievedContext[]
): React.ReactNode {
  if (typeof children === "string") {
    const parts: React.ReactNode[] = [];
    let last = 0;
    CITE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CITE_RE.exec(children)) !== null) {
      if (m.index > last) parts.push(children.slice(last, m.index));
      const idx = parseInt(m[1], 10) - 1;
      const page = m[2] ? parseInt(m[2], 10) : undefined;
      const ctx = contexts?.[idx];
      parts.push(
        <CitationChip
          key={`${m.index}-${m[0]}`}
          number={idx + 1}
          page={page}
          ctx={ctx}
        />
      );
      last = m.index + m[0].length;
    }
    if (last === 0) return children;
    if (last < children.length) parts.push(children.slice(last));
    return parts;
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => (
      <React.Fragment key={i}>{transformCitations(c, contexts)}</React.Fragment>
    ));
  }
  return children;
}

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: { step: string; message?: string }[];
  contexts?: RetrievedContext[];
  streaming?: boolean;
  error?: string;
  attachments?: { filename: string }[];
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-3 animate-fade-in">
        <div className="flex max-w-[90%] flex-col items-end gap-1.5 sm:max-w-[80%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {message.attachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs"
                >
                  <FileText className="h-3 w-3 shrink-0 text-primary" />
                  <span className="max-w-[160px] truncate font-medium">{a.filename}</span>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-2xl rounded-tr-sm bg-primary/90 px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
            {message.content}
          </div>
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
        <Brain className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {message.streaming && message.steps && message.steps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 animate-fade-in">
            {message.steps.map((s, i) => {
              const isLast = i === message.steps!.length - 1;
              return (
                <Badge
                  key={i}
                  variant="subtle"
                  className="gap-1.5 border border-border"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isLast
                        ? "bg-primary animate-pulse-dot"
                        : "bg-emerald-500"
                    )}
                  />
                  {s.message ?? s.step}
                </Badge>
              );
            })}
          </div>
        )}

        {message.contexts && message.contexts.length > 0 && (
          <div className="rounded-lg border border-dashed bg-card/40 p-2">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Retrieved context
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                {message.contexts.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {message.contexts.slice(0, 3).map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
                    S{i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {(c.filename || c.page != null) && (
                      <span className="flex items-center gap-1.5 text-[10px] font-medium text-foreground/80">
                        {c.filename && (
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-2.5 w-2.5" />
                            <span className="line-clamp-1">{c.filename}</span>
                          </span>
                        )}
                        {c.page != null && (
                          <span className="rounded bg-muted px-1 py-0.5 text-[9px]">
                            page {c.page}
                          </span>
                        )}
                      </span>
                    )}
                    <span className="line-clamp-2">{c.content}</span>
                  </div>
                  {typeof c.score === "number" && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                      {(c.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="prose prose-sm dark:prose-invert max-w-none rounded-2xl rounded-tl-sm border border-border bg-card/60 px-4 py-3 text-sm leading-relaxed prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2">
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p>{transformCitations(children, message.contexts)}</p>
                ),
                li: ({ children }) => (
                  <li>{transformCitations(children, message.contexts)}</li>
                ),
                strong: ({ children }) => (
                  <strong>{transformCitations(children, message.contexts)}</strong>
                ),
                em: ({ children }) => (
                  <em>{transformCitations(children, message.contexts)}</em>
                ),
                td: ({ children }) => (
                  <td>{transformCitations(children, message.contexts)}</td>
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : message.streaming ? (
            <TypingDots />
          ) : null}
          {message.error && (
            <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {message.error}
            </div>
          )}
        </div>

        {!message.streaming && message.content && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCopy}
              aria-label="Copy"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Good">
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Bad">
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-dot" />
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-dot"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-dot"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}
