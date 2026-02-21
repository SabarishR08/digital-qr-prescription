"use client";

import { useEffect, useRef, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import {
  exportScanCsv,
  exportScanJson,
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
  const [isInteracting, setIsInteracting] = useState(false);
  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15000);
  const [pinnedVisible, setPinnedVisible] = useState(true);
  const interactionTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const storageKey = "qr-prescription:scan-preferences";

  const refreshScans = async () => {
    if (!token) {
      return;
    }

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

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          refreshEnabled?: boolean;
          refreshInterval?: number;
          pinnedVisible?: boolean;
        };
        if (typeof parsed.refreshEnabled === "boolean") {
          setRefreshEnabled(parsed.refreshEnabled);
        }
        if (typeof parsed.refreshInterval === "number") {
          setRefreshInterval(parsed.refreshInterval);
        }
        if (typeof parsed.pinnedVisible === "boolean") {
          setPinnedVisible(parsed.pinnedVisible);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({
      refreshEnabled,
      refreshInterval,
      pinnedVisible
    });
    window.localStorage.setItem(storageKey, payload);
  }, [refreshEnabled, refreshInterval, pinnedVisible]);

  useEffect(() => {
    if (!token) {
      return;
    }

    refreshScans();
  }, [token, limit]);

  useEffect(() => {
    const handleInteraction = () => {
      setIsInteracting(true);
      if (interactionTimerRef.current) {
        window.clearTimeout(interactionTimerRef.current);
      }
      interactionTimerRef.current = window.setTimeout(() => {
        setIsInteracting(false);
      }, 4000);
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove", "focusin"];
    events.forEach((event) => window.addEventListener(event, handleInteraction, { passive: true }));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleInteraction));
      if (interactionTimerRef.current) {
        window.clearTimeout(interactionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (!refreshEnabled) {
      return;
    }

    const interval = window.setInterval(() => {
      if (!isInteracting && !loading && !exporting) {
        refreshScans();
      }
    }, refreshInterval);

    return () => window.clearInterval(interval);
  }, [token, isInteracting, loading, exporting, refreshEnabled, refreshInterval, limit, result, actorRole, prescriptionId, from, to, query]);

  useEffect(() => {
    if (!liveToast) {
      return;
    }
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setLiveToast(null), 2200);
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [liveToast]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        downloadCsv();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        refreshScans();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [limit, result, actorRole, prescriptionId, from, to, query, token]);

  const applyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCursor(null);
    setHasMore(true);
    await refreshScans();
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

  const downloadJson = async () => {
    if (!token) {
      return;
    }

    setExporting(true);
    try {
      const blob = await exportScanJson(token, {
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
      anchor.download = `scan-history-${stamp}.json`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export JSON");
    } finally {
      setExporting(false);
    }
  };

  return (
    <RoleGuard>
      <main className="min-h-screen bg-slate-50 p-8">
        <section className="mx-auto max-w-5xl space-y-6">
          <DashboardHeader liveModeActive={refreshEnabled} />

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
                <details className="relative">
                  <summary className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                    {exporting ? "Exporting..." : "Export"}
                  </summary>
                  <span className="absolute -right-2 -top-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    Ctrl+E
                  </span>
                  <div className="absolute right-0 z-10 mt-2 w-36 rounded-lg border border-slate-200 bg-white p-2 shadow-md">
                    <button
                      className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50"
                      type="button"
                      onClick={downloadCsv}
                      disabled={exporting}
                    >
                      CSV
                    </button>
                    <button
                      className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50"
                      type="button"
                      onClick={downloadJson}
                      disabled={exporting}
                    >
                      JSON
                    </button>
                  </div>
                </details>
                <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={refreshEnabled}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setRefreshEnabled(next);
                        setLiveToast(next ? "Live mode enabled" : "Live mode paused");
                      }}
                    />
                    Auto-refresh
                  </label>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    Ctrl+R
                  </span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pinnedVisible}
                      onChange={(event) => setPinnedVisible(event.target.checked)}
                    />
                    Pin latest
                  </label>
                  <select
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    value={refreshInterval}
                    onChange={(event) => setRefreshInterval(Number(event.target.value))}
                    disabled={!refreshEnabled}
                  >
                    <option value={5000}>5s</option>
                    <option value={15000}>15s</option>
                    <option value={30000}>30s</option>
                  </select>
                </div>
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
              {scans.map((scan, index) => (
                <div
                  key={scan.id}
                  className={`rounded-xl border p-4 ${
                    scan.result === "FAIL" ? "border-rose-200 bg-rose-50/40" : "border-slate-200"
                  } ${index === 0 ? "ring-1 ring-emerald-200" : ""}`}
                >
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
                      {index === 0 ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                          Latest
                        </span>
                      ) : null}
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

          {scans.length && pinnedVisible ? (
            <div className="fixed bottom-6 right-6 z-20 max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
              <p className="text-xs uppercase tracking-wide text-slate-400">Latest scan</p>
              <button
                className="absolute right-3 top-3 text-[10px] text-slate-400"
                type="button"
                onClick={() => setPinnedVisible(false)}
              >
                Close
              </button>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    scans[0].result === "SUCCESS"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {scans[0].result}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(scans[0].createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {scans[0].reason ?? "Scan"} · {scans[0].actorRole}
              </p>
              <p className="mt-1 truncate text-[11px] text-slate-500">
                {scans[0].prescriptionId ?? "Unknown prescription"}
              </p>
            </div>
          ) : null}
          {liveToast ? (
            <div className="fixed bottom-6 left-6 z-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">
              {liveToast}
            </div>
          ) : null}
        </section>
      </main>
    </RoleGuard>
  );
}
