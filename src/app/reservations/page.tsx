"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, CheckCircle2, CircleX,
  RefreshCw, Search, XCircle, Users
} from "lucide-react";
import {
  type Booking, getBookings, cancelBooking
} from "@/lib/bookings";

export default function ReservationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await getBookings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const text = [
        b.customer, b.email, b.service, b.id
      ].join(" ").toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (!date || b.date === date) &&
        (status === "All" || b.status === status)
      );
    }).sort((a, b) =>
      `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)
    );
  }, [bookings, search, date, status]);

  async function handleCancel(id: string) {
    if (!window.confirm("Cancel this booking?")) return;
    setBusy(id);
    setError("");

    try {
      await cancelBooking(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellation failed");
    } finally {
      setBusy(null);
    }
  }

  const stats = [
    {
      label: "Total Reservations",
      value: bookings.length,
      icon: CalendarDays
    },
    {
      label: "Confirmed",
      value: bookings.filter(b => b.status === "Confirmed").length,
      icon: CheckCircle2
    },
    {
      label: "Cancelled",
      value: bookings.filter(b => b.status === "Cancelled").length,
      icon: CircleX
    }
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-sm text-teal-700">
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold">Reservations</h1>
            <p className="text-sm text-slate-500">
              Manage all your reservations in one place.
            </p>
          </div>
          <Link
            href="/book"
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            + New Booking
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((item) => (
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
              <h2 className="text-lg font-bold">All Reservations</h2>
              <p className="text-sm text-slate-500">
                {filtered.length} matching reservations
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

          <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_190px_170px_auto]">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search reservations..."
                className="w-full min-w-0 py-3 text-sm outline-none"
              />
            </label>

            <input
              aria-label="Filter by date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />

            <select
              aria-label="Filter by status"
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option>All</option>
              <option>Confirmed</option>
              <option>Cancelled</option>
            </select>

            <button
              onClick={() => {
                setSearch("");
                setDate("");
                setStatus("All");
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            >
              Clear
            </button>
          </div>

          {error && (
            <p role="alert" className="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["Customer", "Service", "Date", "Time", "Status", "Action"].map(h => (
                    <th key={h} className="px-5 py-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{b.customer}</p>
                      <p className="text-xs text-slate-500">{b.email}</p>
                    </td>
                    <td className="px-5 py-4">{b.service}</td>
                    <td className="px-5 py-4">{b.date}</td>
                    <td className="px-5 py-4">{b.time}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        b.status === "Confirmed"
                          ? "bg-teal-50 text-teal-700"
                          : "bg-red-50 text-red-600"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {b.status === "Confirmed" ? (
                        <button
                          disabled={busy === b.id}
                          onClick={() => void handleCancel(b.id)}
                          className="flex items-center gap-1 text-red-600 disabled:opacity-50"
                        >
                          <XCircle size={15} />
                          {busy === b.id ? "Cancelling..." : "Cancel"}
                        </button>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <p className="py-16 text-center text-slate-500">
                Loading reservations...
              </p>
            )}

            {!loading && filtered.length === 0 && (
              <p className="py-16 text-center text-slate-500">
                No matching reservations.
              </p>
            )}
          </div>
        </section>

        <Link href="/customers" className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
          <Users size={17} /> View Customers
        </Link>
      </main>
    </div>
  );
}
