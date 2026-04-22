"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUser, getToken, fetchMe, clearSession, type AuthUser } from "@/lib/auth";

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
};

const Ctx = React.createContext<AuthCtx>({
  user: null,
  token: null,
  loading: true,
  refresh: async () => {},
  signOut: () => {}
});

export function useAuth() {
  return React.useContext(Ctx);
}

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = React.useState<AuthUser | null>(getUser);
  const [token, setToken] = React.useState<string | null>(getToken);
  const [loading, setLoading] = React.useState(true);

  const signOut = React.useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
    router.push("/login");
  }, [router]);

  const refresh = React.useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      signOut();
    }
  }, [signOut]);

  // Verify token on mount
  React.useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((me) => { setUser(me); setToken(t); })
      .catch(() => { clearSession(); setUser(null); setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  // Route guard
  React.useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!user && !isPublic) {
      router.push("/login");
    } else if (user && isPublic) {
      router.push("/chat");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-primary/20 animate-pulse" />
          <p className="text-xs text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ user, token, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
