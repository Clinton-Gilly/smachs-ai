"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isRateLimit =
      error.message.toLowerCase().includes("rate limit") ||
      error.message.toLowerCase().includes("429");

    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md w-full rounded-xl border border-border/60 bg-card/60 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-950/40 border border-amber-800/40 p-4">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold">
              {isRateLimit ? "API Rate Limit Reached" : "Something went wrong"}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {isRateLimit
                ? "The Gemini API free-tier rate limit has been exceeded. Wait a moment and try again."
                : error.message}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => this.setState({ error: null })}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </Button>
        </div>
      </div>
    );
  }
}
