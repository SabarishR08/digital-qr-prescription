"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import QrScanner from "../../components/QrScanner";
import { useAuth } from "../../features/auth/AuthContext";
import { createPrescription, verifyPrescription } from "../../features/prescriptions/prescriptionService";
import type { Medication, Prescription } from "../../features/prescriptions/types";
import { exportScanCsv, exportScanJson, fetchScanHistory } from "../../features/scans/scanService";
import type { ScanLog } from "../../features/scans/types";

const emptyMedication = (): Medication => ({
  name: "",
  dosage: "",
  frequency: "",
  duration: ""
});

export default function DoctorPage() {
  const { token, user } = useAuth();
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<Medication[]>([emptyMedication()]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [created, setCreated] = useState<Prescription | null>(null);
  const [verifyPayload, setVerifyPayload] = useState("");
  const [verifyResult, setVerifyResult] = useState<Prescription | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanExporting, setScanExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setVerifyPayload(text);
    setToast("QR captured");
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    setMedications((prev) =>
      prev.map((med, idx) => (idx === index ? { ...med, [field]: value } : med))
    );
  };

  const addMedication = () => {
    setMedications((prev) => [...prev, emptyMedication()]);
  };

  const removeMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Missing auth token. Please sign in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createPrescription(token, {
        patientName,
        patientEmail,
        notes: notes.trim() ? notes : undefined,
        medications
      });
      setQrCode(response.qrCode);
      setCreated(response.prescription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create prescription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard roles={["DOCTOR"]}>
      <main className="min-h-screen bg-slate-50 p-8">
        <section className="mx-auto max-w-5xl space-y-6">
          <DashboardHeader />

          <form
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Patient name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={patientName}
                  onChange={(event) => setPatientName(event.target.value)}
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Patient email
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  type="email"
                  value={patientEmail}
                  onChange={(event) => setPatientEmail(event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="text-sm font-medium text-slate-700">
              Notes
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Medications</h2>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  onClick={addMedication}
                >
                  Add
                </button>
              </div>

              {medications.map((med, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-4">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Medication name"
                    value={med.name}
                    onChange={(event) => updateMedication(index, "name", event.target.value)}
                    required
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(event) => updateMedication(index, "dosage", event.target.value)}
                    required
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(event) => updateMedication(index, "frequency", event.target.value)}
                    required
                  />
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Duration"
                      value={med.duration}
                      onChange={(event) => updateMedication(index, "duration", event.target.value)}
                      required
                    />
                    {medications.length > 1 ? (
                      <button
                        type="button"
                        className="text-xs text-rose-600"
                        onClick={() => removeMedication(index)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

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
              {loading ? "Creating..." : "Create prescription"}
            </button>
          </form>

          {created ? (
            <section className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Prescription created</h2>
                <p className="mt-1 text-sm text-slate-600">
                  ID: {created.id}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Status: {created.status}
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {created.medications.map((med, index) => (
                    <div key={index} className="rounded-lg bg-slate-50 px-3 py-2">
                      {med.name} — {med.dosage}, {med.frequency}, {med.duration}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">QR code</h2>
                {qrCode ? (
                  <img className="mx-auto mt-4 w-56" src={qrCode} alt="Prescription QR code" />
                ) : (
                  <p className="mt-4 text-sm text-slate-500">QR code will appear here.</p>
                )}
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <form
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!token) {
                  setVerifyError("Missing auth token. Please sign in again.");
                  return;
                }
                setVerifyError(null);
                try {
                  const response = await verifyPrescription(token, verifyPayload);
                  setVerifyResult(response.prescription);
                  await loadScanHistory();
                } catch (err) {
                  setVerifyError(err instanceof Error ? err.message : "Verification failed");
                  await loadScanHistory();
                }
              }}
            >
              <h2 className="text-lg font-semibold text-slate-900">Verify a QR payload</h2>
              <label className="text-sm font-medium text-slate-700">
                QR payload
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={3}
                  value={verifyPayload}
                  onChange={(event) => setVerifyPayload(event.target.value)}
                  required
                />
              </label>
              {verifyError ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {verifyError}
                </p>
              ) : null}
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                type="submit"
              >
                Verify
              </button>
              {verifyResult ? (
                <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  Verified {verifyResult.patientName} · {verifyResult.medications.length} meds
                </div>
              ) : null}
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Scan with camera</h2>
              <p className="text-xs text-slate-500">Scans fill the QR payload input.</p>
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
          </section>
        </section>
      </main>
    </RoleGuard>
  );
}
