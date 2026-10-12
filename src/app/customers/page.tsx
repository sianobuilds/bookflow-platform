"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, CalendarDays, Search, RefreshCw
} from "lucide-react";
import { type Booking, getBookings } from "@/lib/bookings";

type Customer = {
  email: string;
  name: string;
  bookings: Booking[];
  confirmed: number;
  latest: string;
};

export default function CustomersPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setBookings(await getBookings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const customers = useMemo(() => {
    const groups = new Map<string, Booking[]>();

    for (const booking of bookings) {
      const key = booking.email.trim().toLowerCase();
      groups.set(key, [...(groups.get(key) || []), booking]);
    }

    return Array.from(groups.entries()).map(([email, items]): Customer => {
      const sorted = [...items].sort((a, b) =>
        `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)
      );

      return {
        email,
        name: sorted[0].customer,
        bookings: sorted,
        confirmed: items.filter(b => b.status === "Confirmed").length,
        latest: sorted[0].date
      };
    }).sort((a, b) => b.latest.localeCompare(a.latest));
  }, [bookings]);

  const filtered = customers.filter(c =>
    `${c.name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const active = customers.find(c => c.email === selected);

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-sm text-teal-700">
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold">Customers</h1>
            <p className="text-sm text-slate-500">
              Customer profiles and booking history.
            </p>
          </div>
          <Link
            href="/reservations"
            className="rounded-xl border border-teal-200 px-4 py-3 text-sm font-semibold text-teal-700"
          >
            Reservations
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Customers", value: customers.length, icon: Users },
            { label: "Total Bookings", value: bookings.length, icon: CalendarDays },
            {
              label: "Repeat Customers",
              value: customers.filter(c => c.bookings.length > 1).length,
              icon: Users
            }
          ].map(item => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <item.icon size={23} className="mb-5 text-teal-700" />
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6">
            <div>
              <h2 className="text-lg font-bold">Customer Directory</h2>
              <p className="text-sm text-slate-500">
                Customers grouped by email address.
              </p>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          <div className="p-5">
            <label className="flex max-w-lg items-center gap-2 rounded-lg border border-slate-200 px-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full py-3 text-sm outline-none"
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["Customer", "Bookings", "Active", "Latest Booking", "Action"].map(h => (
                    <th key={h} className="px-5 py-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.email} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </td>
                    <td className="px-5 py-4">{c.bookings.length}</td>
                    <td className="px-5 py-4">{c.confirmed}</td>
                    <td className="px-5 py-4">{c.latest}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelected(
                          selected === c.email ? null : c.email
                        )}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        {selected === c.email ? "Hide" : "View history"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <p className="py-16 text-center text-slate-500">
                Loading customers...
              </p>
            )}

            {!loading && filtered.length === 0 && (
              <p className="py-16 text-center text-slate-500">
                No customers found.
              </p>
            )}
          </div>
        </section>

        {active && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{active.name}</h2>
                <p className="text-sm text-slate-500">{active.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-slate-500"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {active.bookings.map(b => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"
                >
                  <div>
                    <p className="font-semibold">{b.service}</p>
                    <p className="text-sm text-slate-500">
                      {b.date} at {b.time}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    b.status === "Confirmed"
                      ? "bg-teal-50 text-teal-700"
                      : "bg-red-50 text-red-600"
                  }`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
