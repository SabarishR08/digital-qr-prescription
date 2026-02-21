"use client";

import Link from "next/link";
import { useAuth } from "../features/auth/AuthContext";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <section className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold text-slate-900">
          Digital QR Prescription System
        </h1>
        <p className="text-slate-700">
          Production-ready foundation for secure prescriptions, QR verification,
          and role-based workflows.
        </p>
        <div className="flex flex-wrap gap-3">
          {!user ? (
            <>
              <Link
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                href="/login"
              >
                Sign in
              </Link>
              <Link
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
                href="/register"
              >
                Create account
              </Link>
            </>
          ) : (
            <>
              {user.role === "DOCTOR" ? (
                <Link
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  href="/doctor"
                >
                  Doctor dashboard
                </Link>
              ) : null}
              {user.role === "PATIENT" ? (
                <Link
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  href="/patient"
                >
                  Patient portal
                </Link>
              ) : null}
              {user.role === "PHARMACIST" ? (
                <Link
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  href="/pharmacy"
                >
                  Pharmacy verification
                </Link>
              ) : null}
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
                type="button"
                onClick={logout}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
