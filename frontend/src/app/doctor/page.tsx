"use client";

import { useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import { useAuth } from "../../features/auth/AuthContext";
import { createPrescription } from "../../features/prescriptions/prescriptionService";
import type { Medication, Prescription } from "../../features/prescriptions/types";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <section className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Doctor workspace</h1>
            <p className="text-sm text-slate-600">
              Signed in as {user?.fullName}. Create a new prescription below.
            </p>
          </div>

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
        </section>
      </main>
    </RoleGuard>
  );
}
