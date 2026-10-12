"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BedDouble, CalendarCheck2, CalendarDays, Users,
  ArrowUpRight, RefreshCw, Lock, CheckCircle2,
  LogIn, LogOut, Plus, TrendingUp
} from "lucide-react";

type Room = {
  id: number;
  name: string;
  category: string;
};

type Reservation = {
  id: number;
  room_id: number;
  room_name: string;
  guest: string;
  email: string;
  check_in: string;
  check_out: string;
  status: string;
  created_at: string;
};

type Inventory = {
  rooms: Room[];
  days: string[];
  blocks: { room_id: number; day: string }[];
  reservations: Reservation[];
};

function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

async function fetchAPI<T>(path: string): Promise<T> {
  const response = await fetch(`/api/inventory/${path}`, {
    cache: "no-store"
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof result.detail === "string"
        ? result.detail
        : "Unable to load dashboard data"
    );
  }

  return result as T;
}

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = localDate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [roomData, bookingData, inventoryData] =
        await Promise.all([
          fetchAPI<Room[]>("rooms"),
          fetchAPI<Reservation[]>("reservations"),
          fetchAPI<Inventory>(
            `calendar?start=${localDate()}&end=${localDate(1)}`
          )
        ]);

      setRooms(roomData);
      setReservations(bookingData);
      setInventory(inventoryData);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmed = useMemo(
    () => reservations.filter(r => r.status === "Confirmed"),
    [reservations]
  );

  const todayCheckIns = confirmed.filter(
    r => r.check_in === today
  );

  const todayCheckOuts = confirmed.filter(
    r => r.check_out === today
  );

  const occupiedToday = rooms.filter(room =>
    confirmed.some(
      r =>
        r.room_id === room.id &&
        r.check_in <= today &&
        r.check_out > today
    )
  ).length;

  const blockedToday = new Set(
    (inventory?.blocks ?? [])
      .filter(b => b.day === today)
      .map(b => b.room_id)
  ).size;

  const availableToday = Math.max(
    0,
    rooms.length - occupiedToday - blockedToday
  );

  const occupancy = rooms.length
    ? Math.round((occupiedToday / rooms.length) * 100)
    : 0;

  const recent = [...reservations]
    .sort((a, b) => b.id - a.id)
    .slice(0, 8);

  const metrics = [
    {
      label: "Total Rooms",
      value: rooms.length,
      icon: BedDouble,
      color: "text-blue-700",
      bg: "bg-blue-50"
    },
    {
      label: "Active Reservations",
      value: confirmed.length,
      icon: CalendarCheck2,
      color: "text-teal-700",
      bg: "bg-teal-50"
    },
    {
      label: "Available Today",
      value: availableToday,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50"
    },
    {
      label: "Occupancy Today",
      value: `${occupancy}%`,
      icon: TrendingUp,
      color: "text-amber-700",
      bg: "bg-amber-50"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Business overview and daily operations
            </p>
          </div>

          <button
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-7 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Overview</h2>
            <p className="mt-1 text-sm text-slate-500">
              {new Date(`${today}T12:00:00`).toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric", year: "numeric" }
              )}
            </p>
          </div>

          <Link
            href="/rooms/book"
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Plus size={17} />
            New Booking
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {metrics.map(metric => (
            <div
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${metric.bg} ${metric.color}`}>
                <metric.icon size={21} />
              </div>

              <p className="text-sm text-slate-500">
                {metric.label}
              </p>

              <p className="mt-2 text-3xl font-bold">
                {loading ? "—" : metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <LogIn size={22} />
              </div>
              <div>
                <h3 className="font-bold">Today's Check-ins</h3>
                <p className="text-xs text-slate-500">Arriving guests</p>
              </div>
            </div>

            <p className="text-4xl font-bold">
              {loading ? "—" : todayCheckIns.length}
            </p>

            <div className="mt-5 space-y-3">
              {todayCheckIns.length ? (
                todayCheckIns.slice(0, 4).map(r => (
                  <div
                    key={r.id}
                    className="rounded-lg bg-slate-50 p-3"
                  >
                    <p className="text-sm font-semibold">
                      {r.guest}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.room_name || `Room #${r.room_id}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  No check-ins scheduled.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="font-bold">Today's Check-outs</h3>
                <p className="text-xs text-slate-500">Departing guests</p>
              </div>
            </div>

            <p className="text-4xl font-bold">
              {loading ? "—" : todayCheckOuts.length}
            </p>

            <div className="mt-5 space-y-3">
              {todayCheckOuts.length ? (
                todayCheckOuts.slice(0, 4).map(r => (
                  <div
                    key={r.id}
                    className="rounded-lg bg-slate-50 p-3"
                  >
                    <p className="text-sm font-semibold">
                      {r.guest}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.room_name || `Room #${r.room_id}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  No check-outs scheduled.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
                <BedDouble size={22} />
              </div>
              <div>
                <h3 className="font-bold">Room Status</h3>
                <p className="text-xs text-slate-500">Current availability</p>
              </div>
            </div>

            <div className="space-y-5">
              {[
                {
                  label: "Occupied",
                  value: occupiedToday,
                  color: "bg-blue-500"
                },
                {
                  label: "Available",
                  value: availableToday,
                  color: "bg-teal-500"
                },
                {
                  label: "Sales Stopped",
                  value: blockedToday,
                  color: "bg-red-400"
                }
              ].map(item => (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{
                        width: `${
                          rooms.length
                            ? (item.value / rooms.length) * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/rooms"
              className="mt-6 flex items-center gap-2 text-sm font-semibold text-teal-700"
            >
              Manage Inventory <ArrowUpRight size={16} />
            </Link>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6">
            <div>
              <h3 className="text-lg font-bold">Recent Reservations</h3>
              <p className="mt-1 text-sm text-slate-500">
                Latest room booking activity
              </p>
            </div>

            <Link
              href="/rooms"
              className="flex items-center gap-1 text-sm font-semibold text-teal-700"
            >
              Room Calendar <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {[
                    "Booking ID",
                    "Guest",
                    "Room",
                    "Check-in",
                    "Check-out",
                    "Status"
                  ].map(col => (
                    <th key={col} className="px-6 py-4 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recent.map(r => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 font-semibold">
                      #{r.id}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{r.guest}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {r.room_name || `Room #${r.room_id}`}
                    </td>
                    <td className="px-6 py-4">{r.check_in}</td>
                    <td className="px-6 py-4">{r.check_out}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        r.status === "Confirmed"
                          ? "bg-teal-50 text-teal-700"
                          : "bg-red-50 text-red-600"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && recent.length === 0 && (
              <div className="py-14 text-center text-slate-400">
                <CalendarDays size={28} className="mx-auto mb-3" />
                <p className="text-sm">No room reservations yet.</p>
              </div>
            )}

            {loading && (
              <p className="py-10 text-center text-sm text-slate-500">
                Loading dashboard...
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/rooms"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-300"
          >
            <div className="flex items-center gap-3">
              <Lock size={21} className="text-teal-700" />
              <div>
                <p className="font-semibold">Room Inventory</p>
                <p className="text-xs text-slate-500">
                  Manage sales stops and availability
                </p>
              </div>
            </div>
            <ArrowUpRight size={19} />
          </Link>

          <Link
            href="/customers"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-300"
          >
            <div className="flex items-center gap-3">
              <Users size={21} className="text-teal-700" />
              <div>
                <p className="font-semibold">Customers</p>
                <p className="text-xs text-slate-500">
                  View guest information
                </p>
              </div>
            </div>
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </main>
    </div>
  );
}
