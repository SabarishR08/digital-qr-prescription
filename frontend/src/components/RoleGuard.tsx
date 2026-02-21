"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../features/auth/AuthContext";
import type { Role } from "../features/auth/types";

type RoleGuardProps = {
  roles?: Role[];
  children: React.ReactNode;
};

export default function RoleGuard({ roles, children }: RoleGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (roles && !roles.includes(user.role)) {
      router.replace("/");
    }
  }, [loading, user, roles, router]);

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading your workspace...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
