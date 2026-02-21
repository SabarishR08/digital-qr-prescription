"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import {
  exportScanCsv,
  fetchScanHistory,
  fetchScanHistoryFiltered
} from "../../features/scans/scanService";
import { useAuth } from "../../features/auth/AuthContext";
import type { ScanLog } from "../../features/scans/types";

export default function ScansPage() {
  const { token } = useAuth();
  const [scans, setScans] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    fetchScanHistory(token, limit)
      .then((response) => {
        setScans(response.scans);
        setCursor(response.nextCursor ?? null);
        setHasMore(Boolean(response.nextCursor));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load scan history");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, limit]);

  const applyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCursor(null);
    setHasMore(true);
    setLoading(true);
    setError(null);

    try {
      const response = await fetchScanHistoryFiltered(token, {
        limit,
        cursor: undefined,
        result: result || undefined,
        actorRole: actorRole || undefined,
        prescriptionId: prescriptionId.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        q: query.trim() || undefined
      });
      setScans(response.scans);
      setCursor(response.nextCursor ?? null);
      setHasMore(Boolean(response.nextCursor));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load scan history");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setResult("");
    setActorRole("");
    setPrescriptionId("");
    setFrom("");
    setTo("");
    setQuery("");
    setLimit(20);
    setCursor(null);
    setHasMore(true);
  };

  const downloadCsv = async () => {
    if (!token) {
      return;
    }

    setExporting(true);
    try {
      const blob = await exportScanCsv(token, {
        result: result || undefined,
        actorRole: actorRole || undefined,
        prescriptionId: prescriptionId.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        q: query.trim() || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `scan-history-${stamp}.csv`;
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
            <h2 className="text-xl font-semibold text-slate-900">Scan history</h2>
            <p className="text-sm text-slate-600">
              Track QR verifications, results, and reasons.
            </p>

            <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3" onSubmit={applyFilters}>
              <label className="text-xs font-semibold text-slate-600 md:col-span-3">
                Search
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Prescription ID, actor email, or reason"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Result
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={result}
                  onChange={(event) => setResult(event.target.value)}
                >
                  <option value="">All</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAIL">FAIL</option>
                </select>
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
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setCursor(null);
                    setHasMore(true);
                  }}
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
              <p className="mt-4 text-sm text-slate-500">Loading scan history...</p>
            ) : null}

            {!loading && scans.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No scans recorded yet.</p>
            ) : null}

            <div className="mt-4 space-y-3">
              {scans.map((scan) => (
                <div key={scan.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{scan.reason ?? "Scan"}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(scan.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          scan.result === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {scan.result}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          scan.actorRole === "DOCTOR"
                            ? "bg-emerald-50 text-emerald-700"
                            : scan.actorRole === "PHARMACIST"
                            ? "bg-amber-50 text-amber-700"
                            : scan.actorRole === "PATIENT"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {scan.actorRole}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Prescription ID: {scan.prescriptionId ?? "Unknown"}
                  </div>
                </div>
              ))}
            </div>

            {!loading && hasMore ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">Loaded {scans.length} scans</span>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1"
                  type="button"
                  onClick={async () => {
                    if (!token || !cursor) {
                      return;
                    }
                    setLoading(true);
                    try {
                      const response = await fetchScanHistoryFiltered(token, {
                        limit,
                        cursor,
                        result: result || undefined,
                        actorRole: actorRole || undefined,
                        prescriptionId: prescriptionId.trim() || undefined,
                        from: from || undefined,
                        to: to || undefined,
                        q: query.trim() || undefined
                      });
                      setScans((prev) => [...prev, ...response.scans]);
                      setCursor(response.nextCursor ?? null);
                      setHasMore(Boolean(response.nextCursor));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to load more scans");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={!cursor}
                >
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </RoleGuard>
  );
}
