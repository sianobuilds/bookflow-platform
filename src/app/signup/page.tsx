"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

const businessTypes = [
  ["accommodation", "Accommodation", "Hotels & guesthouses"],
  ["restaurant", "Restaurant", "Restaurants & cafes"],
  ["hair", "Hair Salon", "Hair & barber services"],
  ["beauty", "Beauty Studio", "Nails, brows, lashes & skincare"]
];

export default function SignupPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName, email, password, industry
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8f8] px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-10">
        <div className="mb-8">
          <div className="mb-5 inline-flex rounded-xl bg-teal-700 p-3 text-white">
            <Building2 size={24} />
          </div>

          <h1 className="text-3xl font-bold">Create your workspace</h1>
          <p className="mt-2 text-sm text-slate-500">
            Set up your business with BookFlow
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Business Name
            </label>
            <input
              required
              maxLength={100}
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Your business name"
              className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Business Type
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              {businessTypes.map(([id, name, description]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setIndustry(id)}
                  className={`rounded-xl border p-4 text-left ${
                    industry === id
                      ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
                      : "border-slate-200"
                  }`}
                >
                  <span className="block text-sm font-bold">{name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="owner@example.com"
              className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Password</label>
            <input
              type="password"
              required
              minLength={10}
              maxLength={128}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 10 characters"
              className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-teal-600"
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
            {loading ? "Creating account..." : "Create Account"}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-teal-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
