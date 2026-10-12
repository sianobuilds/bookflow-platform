"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [industry, setIndustry] = useState("restaurant");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, industry })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f8f8] px-4 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div className="mb-5 inline-flex rounded-xl bg-teal-700 p-3 text-white">
            <LogIn size={24} />
          </div>

          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">
            Log in to your BookFlow workspace
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Business Type
            </label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3"
            >
              <option value="accommodation">Accommodation</option>
              <option value="restaurant">Restaurant</option>
              <option value="hair">Hair Salon</option>
              <option value="beauty">Beauty Studio</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3"
              placeholder="owner@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 p-4 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to BookFlow?{" "}
          <Link href="/signup" className="font-semibold text-teal-700">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
