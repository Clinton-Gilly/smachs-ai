"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { login } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { refresh } = useAuth();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      await refresh(); // update context state — route guard will then redirect to /chat
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background gradient-mesh px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30">
            <Zap className="h-8 w-8 fill-current" />
            <span className="absolute -inset-2 rounded-3xl bg-primary/20 blur-xl -z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smachs AI</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-xl shadow-black/10 flex flex-col gap-4"
        >
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground/80" htmlFor="username">
              Username or Email
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className={cn(
                "h-10 rounded-xl border border-border bg-background/60 px-3.5 text-sm outline-none transition-all",
                "focus:border-primary/60 focus:ring-2 focus:ring-primary/20",
                "placeholder:text-muted-foreground/50"
              )}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground/80" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={cn(
                  "h-10 w-full rounded-xl border border-border bg-background/60 px-3.5 pr-10 text-sm outline-none transition-all",
                  "focus:border-primary/60 focus:ring-2 focus:ring-primary/20",
                  "placeholder:text-muted-foreground/50"
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className={cn(
              "mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
              loading || !username.trim() || !password
                ? "bg-primary/40 text-primary-foreground/60 cursor-not-allowed"
                : "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 hover:shadow-md"
            )}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground/50">
          Contact your administrator to get access.
        </p>
      </div>
    </div>
  );
}
