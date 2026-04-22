"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/chat");
    }
  }, [user, loading, router]);

  if (loading) return null;

  if (!user || user.role !== "admin") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
        <ShieldOff className="h-12 w-12 text-muted-foreground/30" />
        <div>
          <p className="text-sm font-semibold">Access Denied</p>
          <p className="text-xs text-muted-foreground mt-1">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
