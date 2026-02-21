"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import DashboardHeader from "../../components/DashboardHeader";
import { useAuth } from "../../features/auth/AuthContext";
import { fetchMyPrescriptions } from "../../features/prescriptions/prescriptionService";
import type { Prescription } from "../../features/prescriptions/types";

export default function PatientPage() {
  const { token } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchMyPrescriptions(token, true);
        if (active) {
          setPrescriptions(response.prescriptions);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load prescriptions");
        }
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

  const now = useMemo(() => new Date(), []);

  return (
    <RoleGuard roles={["PATIENT"]}>
      <main className="min-h-screen bg-slate-50 p-8">
        <section className="mx-auto max-w-5xl space-y-6">
          <DashboardHeader />

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">My prescriptions</h2>
            <p className="text-xs text-slate-500">Show the QR code at the pharmacy for verification.</p>

            {error ? (
              <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading prescriptions...</p>
            ) : null}

            {!loading && !prescriptions.length ? (
              <p className="mt-4 text-sm text-slate-500">No prescriptions yet.</p>
            ) : null}

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {prescriptions.map((prescription) => {
                const expiresAt = prescription.expiresAt ? new Date(prescription.expiresAt) : null;
                const expired = expiresAt ? expiresAt < now : false;
                const statusLabel = expired ? "EXPIRED" : prescription.status;

                return (
                  <div
                    key={prescription.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Prescription</p>
                        <p className="text-sm font-semibold text-slate-900">{prescription.id}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          statusLabel === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : statusLabel === "REDEEMED"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                      <p>Doctor ID: {prescription.doctorId}</p>
                      <p>Expires: {expiresAt ? expiresAt.toLocaleString() : "Not set"}</p>
                    </div>

                    <div className="mt-4 rounded-xl bg-white p-3 text-center">
                      {prescription.qrCode ? (
                        <img
                          className="mx-auto w-44"
                          src={prescription.qrCode}
                          alt="Prescription QR"
                        />
                      ) : (
                        <p className="text-xs text-slate-500">QR not available.</p>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      {prescription.medications.map((med, index) => (
                        <div key={index} className="rounded-lg bg-white px-3 py-2">
                          {med.name} — {med.dosage}, {med.frequency}, {med.duration}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </RoleGuard>
  );
}
