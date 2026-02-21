"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "../../../components/RoleGuard";
import { useAuth } from "../../../features/auth/AuthContext";
import type { UserPreferences } from "../../../features/preferences/types";
import {
  fetchAdminDefaults,
  updateAdminDefaults
} from "../../../features/preferences/preferencesService";

const INTERVAL_OPTIONS = [5000, 10000, 15000, 30000, 60000];

export default function AdminPreferenceDefaultsPage() {
  const { token } = useAuth();
  const [defaults, setDefaults] = useState<UserPreferences | null>(null);
  const [form, setForm] = useState<UserPreferences | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<{ fullName: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setError(null);
        const response = await fetchAdminDefaults(token);
        if (!active) {
          return;
        }
        setDefaults(response.defaults);
        setForm(response.defaults);
        setUpdatedAt(response.updatedAt ?? null);
        setUpdatedBy(response.updatedBy ? {
          fullName: response.updatedBy.fullName,
          email: response.updatedBy.email
        } : null);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load defaults");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [token]);

  const updatedLabel = useMemo(() => {
    if (!updatedAt) {
      return "Not updated yet";
    }
    const timestamp = new Date(updatedAt).toLocaleString();
    if (updatedBy) {
      return `${timestamp} by ${updatedBy.fullName} (${updatedBy.email})`;
    }
    return `${timestamp} by system`;
  }, [updatedAt, updatedBy]);

  const updateForm = (updates: Partial<UserPreferences>) => {
    if (!form) {
      return;
    }
    setForm({ ...form, ...updates });
  };

  const canSave = !!form && !saving && !loading;

  return (
    <RoleGuard roles={["ADMIN"]}>
      <main className="min-h-screen bg-slate-50 p-8">
        <section className="mx-auto max-w-3xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              Admin preference defaults
            </h1>
            <p className="text-sm text-slate-600">
              Set baseline preferences for all users. New accounts and resets will
              use these values.
            </p>
          </header>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Last updated</p>
                <p className="text-sm text-slate-700">{updatedLabel}</p>
              </div>
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                type="button"
                disabled={!canSave}
                onClick={async () => {
                  if (!token || !form) {
                    return;
                  }
                  setSaving(true);
                  setNotice(null);
                  setError(null);
                  try {
                    const response = await updateAdminDefaults(token, form);
                    setDefaults(response.defaults);
                    setForm(response.defaults);
                    setUpdatedAt(response.updatedAt ?? null);
                    setUpdatedBy(response.updatedBy ? {
                      fullName: response.updatedBy.fullName,
                      email: response.updatedBy.email
                    } : null);
                    setNotice("Defaults updated successfully.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Unable to save defaults");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving..." : "Save defaults"}
              </button>
            </div>

            {notice ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </div>
            ) : null}

            <div className="mt-6 grid gap-6">
              <div className="grid gap-3">
                <h2 className="text-sm font-semibold text-slate-800">Audit preferences</h2>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form?.auditRefreshEnabled ?? false}
                    onChange={(event) => updateForm({ auditRefreshEnabled: event.target.checked })}
                    disabled={!form}
                  />
                  Enable live refresh by default
                </label>
                <label className="text-sm text-slate-700">
                  Default refresh interval
                  <select
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={form?.auditRefreshInterval ?? 15000}
                    onChange={(event) => updateForm({ auditRefreshInterval: Number(event.target.value) })}
                    disabled={!form}
                  >
                    {INTERVAL_OPTIONS.map((value) => (
                      <option key={`audit-${value}`} value={value}>
                        {value / 1000}s
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3">
                <h2 className="text-sm font-semibold text-slate-800">Scan preferences</h2>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form?.scanRefreshEnabled ?? false}
                    onChange={(event) => updateForm({ scanRefreshEnabled: event.target.checked })}
                    disabled={!form}
                  />
                  Enable live refresh by default
                </label>
                <label className="text-sm text-slate-700">
                  Default refresh interval
                  <select
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={form?.scanRefreshInterval ?? 15000}
                    onChange={(event) => updateForm({ scanRefreshInterval: Number(event.target.value) })}
                    disabled={!form}
                  >
                    {INTERVAL_OPTIONS.map((value) => (
                      <option key={`scan-${value}`} value={value}>
                        {value / 1000}s
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form?.scanPinnedVisible ?? false}
                    onChange={(event) => updateForm({ scanPinnedVisible: event.target.checked })}
                    disabled={!form}
                  />
                  Show pinned live scan card by default
                </label>
              </div>
            </div>
          </div>

          {defaults ? (
            <div className="text-xs text-slate-500">
              Resets and new user setups apply the current admin defaults.
            </div>
          ) : null}
        </section>
      </main>
    </RoleGuard>
  );
}
