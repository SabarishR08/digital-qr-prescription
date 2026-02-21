"use client";

import Link from "next/link";
import { useAuth } from "../features/auth/AuthContext";

export default function DashboardHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">QR Prescription</p>
          <h1 className="text-lg font-semibold text-slate-900">
            {user ? `${user.fullName} · ${user.role}` : "Workspace"}
          </h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {user?.role === "DOCTOR" ? (
            <Link className="rounded-lg border border-slate-200 px-3 py-1" href="/doctor">
              Doctor
            </Link>
          ) : null}
          {user?.role === "PATIENT" ? (
            <Link className="rounded-lg border border-slate-200 px-3 py-1" href="/patient">
              Patient
            </Link>
          ) : null}
          {user?.role === "PHARMACIST" ? (
            <Link className="rounded-lg border border-slate-200 px-3 py-1" href="/pharmacy">
              Pharmacy
            </Link>
          ) : null}
          {user ? (
            <Link className="rounded-lg border border-slate-200 px-3 py-1" href="/audit">
              Audit log
            </Link>
          ) : null}
          {user ? (
            <Link className="rounded-lg border border-slate-200 px-3 py-1" href="/scans">
              Scan history
            </Link>
          ) : null}
          {user ? (
            <button
              className="rounded-lg border border-slate-200 px-3 py-1"
              type="button"
              onClick={logout}
            >
              Sign out
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
