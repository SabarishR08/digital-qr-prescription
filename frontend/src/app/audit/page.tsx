"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import { useAuth } from "../../features/auth/AuthContext";
import { exportAuditCsv, fetchAuditLogs, fetchAuditLogsFiltered } from "../../features/audit/auditService";
import type { AuditLog } from "../../features/audit/types";

export default function AuditPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(50);
  const [exporting, setExporting] = useState(false);

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

  const applyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAuditLogsFiltered(token, {
        limit,
        action: action.trim() || undefined,
        actorRole: actorRole || undefined,
        prescriptionId: prescriptionId.trim() || undefined,
        from: from || undefined,
        to: to || undefined
      });
      setLogs(response.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setAction("");
    setActorRole("");
    setPrescriptionId("");
    setFrom("");
    setTo("");
    setLimit(50);
  };

  const downloadCsv = async () => {
    if (!token) {
      return;
    }

    setExporting(true);
    try {
      const blob = await exportAuditCsv(token, {
        limit,
        action: action.trim() || undefined,
        actorRole: actorRole || undefined,
        prescriptionId: prescriptionId.trim() || undefined,
        from: from || undefined,
        to: to || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `audit-logs-${stamp}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export CSV");
    } finally {
      setExporting(false);
    }
  };

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

            <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3" onSubmit={applyFilters}>
              <label className="text-xs font-semibold text-slate-600">
                Action
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  placeholder="PRESCRIPTION_CREATED"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Actor role
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={actorRole}
                  onChange={(event) => setActorRole(event.target.value)}
                >
                  <option value="">All roles</option>
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="PATIENT">PATIENT</option>
                  <option value="PHARMACIST">PHARMACIST</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Prescription ID
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={prescriptionId}
                  onChange={(event) => setPrescriptionId(event.target.value)}
                  placeholder="cuid..."
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                From
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                To
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Limit
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="number"
                  min={10}
                  max={200}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                />
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <button
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  type="submit"
                >
                  Apply filters
                </button>
                <button
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear
                </button>
                <button
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  type="button"
                  onClick={downloadCsv}
                  disabled={exporting}
                >
                  {exporting ? "Exporting..." : "Download CSV"}
                </button>
              </div>
            </form>

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
