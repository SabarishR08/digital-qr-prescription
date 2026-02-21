"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import { useAuth } from "../../features/auth/AuthContext";
import { fetchAuditLogs } from "../../features/audit/auditService";
import type { AuditLog } from "../../features/audit/types";

export default function AuditPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    fetchAuditLogs(token)
      .then((response) => {
        setLogs(response.logs);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load audit logs");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <RoleGuard>
      <main className="min-h-screen bg-slate-50 p-8">
        <section className="mx-auto max-w-5xl space-y-6">
          <DashboardHeader />

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Audit trail</h2>
            <p className="text-sm text-slate-600">
              Recent prescription activity and verification events.
            </p>

            {error ? (
              <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading logs...</p>
            ) : null}

            {!loading && logs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No audit activity yet.</p>
            ) : null}

            <div className="mt-4 space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {log.actorRole}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{log.details ?? "No details"}</p>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Prescription ID: {log.prescriptionId}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </RoleGuard>
  );
}
