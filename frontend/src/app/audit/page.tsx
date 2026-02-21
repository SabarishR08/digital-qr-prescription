"use client";

import { useEffect, useRef, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import { useAuth } from "../../features/auth/AuthContext";
import { exportAuditCsv, exportAuditJson, fetchAuditLogsFiltered } from "../../features/audit/auditService";
import type { AuditLog } from "../../features/audit/types";
import {
  fetchPreferences,
  getDefaultPreferences,
  loadLocalPreferences,
  mergePreferences,
  resetPreferences,
  saveLocalPreferences,
  updatePreferences
} from "../../features/preferences/preferencesService";

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
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15000);
  const interactionTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [resetting, setResetting] = useState(false);

  const refreshLogs = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAuditLogsFiltered(token, {
        limit,
        cursor: undefined,
        action: action.trim() || undefined,
        actorRole: actorRole || undefined,
        prescriptionId: prescriptionId.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        q: query.trim() || undefined
      });
      setLogs(response.logs);
      setCursor(response.nextCursor ?? null);
      setHasMore(Boolean(response.nextCursor));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadPrefs = async () => {
      try {
        const remote = await fetchPreferences(token);
        const merged = mergePreferences(getDefaultPreferences(), remote);
        setRefreshEnabled(merged.auditRefreshEnabled);
        setRefreshInterval(merged.auditRefreshInterval);
        saveLocalPreferences(merged);
      } catch {
        const local = loadLocalPreferences() ?? getDefaultPreferences();
        setRefreshEnabled(local.auditRefreshEnabled);
        setRefreshInterval(local.auditRefreshInterval);
      } finally {
        setPrefsLoaded(true);
      }
    };

    loadPrefs();
  }, [token]);

  useEffect(() => {
    if (!prefsLoaded) {
      return;
    }

    const current = mergePreferences(getDefaultPreferences(), {
      auditRefreshEnabled: refreshEnabled,
      auditRefreshInterval: refreshInterval
    });
    saveLocalPreferences(current);

    if (token) {
      updatePreferences(token, {
        auditRefreshEnabled: refreshEnabled,
        auditRefreshInterval: refreshInterval
      }).catch(() => undefined);
    }
  }, [prefsLoaded, refreshEnabled, refreshInterval, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    refreshLogs();
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
        refreshLogs();
      }
    }, refreshInterval);

    return () => window.clearInterval(interval);
  }, [token, isInteracting, loading, exporting, refreshEnabled, refreshInterval, limit, action, actorRole, prescriptionId, from, to, query]);

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
        refreshLogs();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [limit, action, actorRole, prescriptionId, from, to, query, token]);

  const applyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCursor(null);
    setHasMore(true);
    await refreshLogs();
  };

  const clearFilters = () => {
    setAction("");
    setActorRole("");
    setPrescriptionId("");
    setFrom("");
    setTo("");
    setQuery("");
    setLimit(50);
    setCursor(null);
    setHasMore(true);
  };

  const downloadCsv = async () => {
    if (!token) {
      return;
    }

    setExporting(true);
    try {
      const blob = await exportAuditCsv(token, {
        action: action.trim() || undefined,
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
      anchor.download = `audit-logs-${stamp}.csv`;
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
      const blob = await exportAuditJson(token, {
        action: action.trim() || undefined,
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
      anchor.download = `audit-logs-${stamp}.json`;
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
            <h2 className="text-xl font-semibold text-slate-900">Audit trail</h2>
            <p className="text-sm text-slate-600">
              Recent prescription activity and verification events.
            </p>

            <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3" onSubmit={applyFilters}>
              <label className="text-xs font-semibold text-slate-600 md:col-span-3">
                Search
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Prescription ID, actor email, or action"
                />
              </label>
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
                  <button
                    className="rounded-md border border-slate-200 px-2 py-1 text-[11px]"
                    type="button"
                    disabled={resetting}
                    onClick={async () => {
                      if (!token) {
                        return;
                      }
                      setResetting(true);
                      try {
                        const preference = await resetPreferences(token);
                        setRefreshEnabled(preference.auditRefreshEnabled);
                        setRefreshInterval(preference.auditRefreshInterval);
                        setLiveToast("Preferences reset to default");
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Unable to reset preferences");
                      } finally {
                        setResetting(false);
                      }
                    }}
                  >
                    {resetting ? "Resetting..." : "Reset defaults"}
                  </button>
                </div>
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
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  className={`rounded-xl border p-4 ${
                    index === 0 ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        log.actorRole === "DOCTOR"
                          ? "bg-emerald-50 text-emerald-700"
                          : log.actorRole === "PHARMACIST"
                          ? "bg-amber-50 text-amber-700"
                          : log.actorRole === "PATIENT"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {log.actorRole}
                    </span>
                    {index === 0 ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                        Latest
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{log.details ?? "No details"}</p>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Prescription ID: {log.prescriptionId}
                  </div>
                </div>
              ))}
            </div>

            {!loading && hasMore ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">Loaded {logs.length} events</span>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1"
                  type="button"
                  onClick={async () => {
                    if (!token || !cursor) {
                      return;
                    }
                    setLoading(true);
                    try {
                      const response = await fetchAuditLogsFiltered(token, {
                        limit,
                        cursor,
                        action: action.trim() || undefined,
                        actorRole: actorRole || undefined,
                        prescriptionId: prescriptionId.trim() || undefined,
                        from: from || undefined,
                        to: to || undefined,
                        q: query.trim() || undefined
                      });
                      setLogs((prev) => [...prev, ...response.logs]);
                      setCursor(response.nextCursor ?? null);
                      setHasMore(Boolean(response.nextCursor));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to load more logs");
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
