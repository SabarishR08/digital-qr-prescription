"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../features/auth/AuthContext";
import type { Role } from "../../features/auth/types";

const roles: Array<Exclude<Role, "ADMIN" | "PHARMACIST">> = ["DOCTOR", "PATIENT"];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<Role, "ADMIN" | "PHARMACIST">>("DOCTOR");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({ fullName, email, password, role });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Register as a doctor or patient.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Role
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
            >
              {roles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
