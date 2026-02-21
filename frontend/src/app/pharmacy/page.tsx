"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import QrScanner from "../../components/QrScanner";
import { useAuth } from "../../features/auth/AuthContext";
import { verifyPrescription } from "../../features/prescriptions/prescriptionService";
import type { Prescription } from "../../features/prescriptions/types";
import { exportScanCsv, exportScanJson, fetchScanHistory } from "../../features/scans/scanService";
import type { ScanLog } from "../../features/scans/types";

export default function PharmacyPage() {
  const { token, user } = useAuth();
  const [qrPayload, setQrPayload] = useState("");
  const [result, setResult] = useState<Prescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanExporting, setScanExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadScanHistory = async () => {
    if (!token) {
      return;
    }

    setScanLoading(true);
    setScanError(null);
    try {
      const response = await fetchScanHistory(token, 10);
      setScanHistory(response.scans);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Unable to load scan history");
    } finally {
      setScanLoading(false);
    }
  };

  const downloadScanCsv = async () => {
    if (!token) {
      return;
    }

    setScanExporting(true);
    try {
      const blob = await exportScanCsv(token, {});
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `scan-history-${stamp}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Unable to export scan history");
    } finally {
      setScanExporting(false);
    }
  };

  const downloadScanJson = async () => {
    if (!token) {
      return;
    }

    setScanExporting(true);
    try {
      const blob = await exportScanJson(token, {});
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `scan-history-${stamp}.json`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Unable to export scan history");
    } finally {
      setScanExporting(false);
    }
  };

  useEffect(() => {
    loadScanHistory();
  }, [token]);

  const handleScan = (text: string) => {
    if (text === lastScan) {
      return;
    }

    setLastScan(text);
    setQrPayload(text);
    setToast("QR captured");
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Missing auth token. Please sign in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await verifyPrescription(token, qrPayload);
      setResult(response.prescription);
      await loadScanHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      await loadScanHistory();
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard roles={["PHARMACIST"]}>
      <main className="min-h-screen bg-slate-50 p-8">
        <section className="mx-auto max-w-4xl space-y-6">
          <DashboardHeader />

          <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleVerify}>
            <label className="text-sm font-medium text-slate-700">
              QR payload
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                rows={3}
                value={qrPayload}
                onChange={(event) => setQrPayload(event.target.value)}
                required
              />
            </label>

            {error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify prescription"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Scan with camera</h2>
            <p className="text-xs text-slate-500">Scans fill the QR payload field.</p>
            <div className="mt-4">
              <QrScanner onResult={handleScan} />
            </div>
            {toast ? (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {toast}
              </div>
            ) : null}
            {scanError ? (
              <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {scanError}
              </div>
            ) : null}
            {scanLoading ? (
              <p className="mt-3 text-xs text-slate-500">Loading scan history...</p>
            ) : null}
            {!scanLoading && scanHistory.length ? (
              <div className="mt-4 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Recent scans:</span>
                  <details className="relative">
                    <summary className="cursor-pointer rounded-md border border-slate-200 px-2 py-1 text-[10px]">
                      {scanExporting ? "Exporting..." : "Export"}
                    </summary>
                    <div className="absolute right-0 z-10 mt-2 w-28 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                      <button
                        className="w-full rounded-md px-2 py-1 text-left text-[11px] hover:bg-slate-50"
                        type="button"
                        onClick={downloadScanCsv}
                        disabled={scanExporting}
                      >
                        CSV
                      </button>
                      <button
                        className="w-full rounded-md px-2 py-1 text-left text-[11px] hover:bg-slate-50"
                        type="button"
                        onClick={downloadScanJson}
                        disabled={scanExporting}
                      >
                        JSON
                      </button>
                    </div>
                  </details>
                </div>
                <div className="mt-2 space-y-2">
                  {scanHistory.map((scan, index) => (
                    <div
                      key={scan.id}
                      className={`rounded-md px-2 py-1 ${
                        scan.result === "FAIL" ? "bg-rose-50" : "bg-slate-50"
                      } ${index === 0 ? "ring-1 ring-emerald-200" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            scan.result === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {scan.result}
                        </span>
                        {index === 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Latest
                          </span>
                        ) : null}
                        <span className="text-[10px] text-slate-500">
                          {new Date(scan.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">
                        {scan.prescriptionId ?? "Unknown prescription"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {result ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Verified prescription</h2>
              <p className="mt-1 text-sm text-slate-600">
                Patient: {result.patientName} ({result.patientEmail})
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {result.medications.map((med, index) => (
                  <div key={index} className="rounded-lg bg-slate-50 px-3 py-2">
                    {med.name} — {med.dosage}, {med.frequency}, {med.duration}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </RoleGuard>
  );
}
