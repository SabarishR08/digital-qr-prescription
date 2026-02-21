"use client";

import { useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import QrScanner from "../../components/QrScanner";
import { useAuth } from "../../features/auth/AuthContext";
import { verifyPrescription } from "../../features/prescriptions/prescriptionService";
import type { Prescription } from "../../features/prescriptions/types";

export default function PharmacyPage() {
  const { token, user } = useAuth();
  const [qrPayload, setQrPayload] = useState("");
  const [result, setResult] = useState<Prescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
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
              <QrScanner onResult={setQrPayload} />
            </div>
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
