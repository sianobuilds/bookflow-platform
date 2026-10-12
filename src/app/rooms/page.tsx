"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RefreshCw,
  Save,
  LockKeyhole,
  UnlockKeyhole,
  X,
  Check,
  Users,
  BedDouble
} from "lucide-react";

type Room = {
  id: number;
  name: string;
  category: string;
};

type Reservation = {
  id: number;
  room_id: number;
  room_name?: string;
  guest: string;
  email: string;
  check_in: string;
  check_out: string;
  status: string;
};

type Block = {
  room_id: number;
  day: string;
};

type Rate = {
  room_id: number;
  day: string;
  price: number;
};

type Inventory = {
  rooms: Room[];
  days: string[];
  blocks: Block[];
  reservations: Reservation[];
};

function iso(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

function shift(day: string, offset: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return iso(d);
}

function label(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric" }
  );
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Request failed: ${response.status}`
    );
  }

  return data as T;
}

export default function RoomsPage() {
  const [start, setStart] = useState(() => iso(new Date()));
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState("120000");
  const [guest, setGuest] = useState<Reservation | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => shift(start, i)),
    [start]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const calendar = await json<Inventory>(
        `/api/inventory/calendar?start=${start}&end=${shift(start, 14)}`
      );

      setInventory(calendar);

      try {
        const rateData = await json<{ rates: Rate[] }>(
          `/api/rates?start=${start}&end=${shift(start, 14)}`
        );
        setRates(rateData.rates ?? []);
      } catch {
        setRates([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [start]);

  useEffect(() => {
    void load();
  }, [load]);

  const rooms = inventory?.rooms ?? [];
  const reservations = inventory?.reservations ?? [];
  const blocks = inventory?.blocks ?? [];

  const categories = [...new Set(rooms.map(r => r.category))];

  const visibleRooms = rooms.filter(
    r => categoryFilter === "All" || r.category === categoryFilter
  );

  const grouped = categories
    .filter(c => categoryFilter === "All" || categoryFilter === c)
    .map(category => ({
      category,
      rooms: visibleRooms.filter(r => r.category === category)
    }));

  function reservationFor(roomId: number, day: string) {
    return reservations.find(
      r =>
        r.room_id === roomId &&
        (r.status ?? "").toLowerCase() === "confirmed" &&
        r.check_in <= day &&
        r.check_out > day
    );
  }

  function blocked(roomId: number, day: string) {
    return blocks.some(
      b => b.room_id === roomId && b.day === day
    );
  }

  function rateFor(roomId: number, day: string) {
    return rates.find(
      r => r.room_id === roomId && r.day === day
    )?.price;
  }

  function toggle(roomId: number, day: string) {
    const key = `${roomId}|${day}`;

    setSelected(previous => {
      const next = new Set(previous);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      return next;
    });
  }

  function selectCategory(categoryRooms: Room[], day: string) {
    setSelected(previous => {
      const next = new Set(previous);

      const keys = categoryRooms
        .filter(room => !reservationFor(room.id, day))
        .map(room => `${room.id}|${day}`);

      const allSelected = keys.every(key => next.has(key));

      keys.forEach(key => {
        if (allSelected) next.delete(key);
        else next.add(key);
      });

      return next;
    });
  }

  const selectedEntries = [...selected].map(key => {
    const [roomId, day] = key.split("|");
    return { room_id: Number(roomId), day };
  });

  async function applyRates() {
    const amount = Number(price);

    if (!selectedEntries.length) {
      setError("Select at least one room date.");
      return;
    }

    if (!Number.isSafeInteger(amount) || amount < 0) {
      setError("Enter a valid nightly rate.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      for (const entry of selectedEntries) {
        await json("/api/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_ids: [entry.room_id],
            start: entry.day,
            end: shift(entry.day, 1),
            price: amount
          })
        });
      }

      setSelected(new Set());
      setNotice(`Updated ${selectedEntries.length} nightly rates.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rate update failed");
    } finally {
      setSaving(false);
    }
  }

  async function applySalesStop(stop: boolean) {
    if (!selectedEntries.length) {
      setError("Select at least one room date.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      for (const entry of selectedEntries) {
        if (reservationFor(entry.room_id, entry.day)) {
          throw new Error(
            "Reserved room dates cannot be changed through sales stop."
          );
        }

        await json("/api/inventory/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: entry.room_id,
            day: entry.day,
            blocked: stop
          })
        });
      }

      setSelected(new Set());
      setNotice(
        stop
          ? `Sales stopped for ${selectedEntries.length} room dates.`
          : `Sales reopened for ${selectedEntries.length} room dates.`
      );

      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sales status update failed"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-bold">Room Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage availability, reservations, sales stops and nightly rates
        </p>
      </header>

      <main className="space-y-5 p-4 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="All">All Room Types</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              onClick={() => setStart(iso(new Date()))}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              Today
            </button>

            <button
              onClick={() => setStart(shift(start, -14))}
              className="rounded-lg border border-slate-200 p-2.5"
              aria-label="Previous 14 days"
            >
              <ChevronLeft size={17} />
            </button>

            <input
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />

            <button
              onClick={() => setStart(shift(start, 14))}
              className="rounded-lg border border-slate-200 p-2.5"
              aria-label="Next 14 days"
            >
              <ChevronRight size={17} />
            </button>

            <button
              onClick={() => void load()}
              className="rounded-lg border border-slate-200 p-2.5"
              aria-label="Refresh inventory"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-medium">
            <span className="text-teal-700">● Available</span>
            <span className="text-blue-700">● Reserved</span>
            <span className="text-red-600">● Sales Stopped</span>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
            {notice}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold">Room Sales Calendar</h2>
              <p className="mt-1 text-xs text-slate-500">
                Select available dates for bulk actions. Click reserved dates to view guests.
              </p>
            </div>

            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">
              {selected.size} dates selected
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-20 min-w-[210px] border-b border-r border-slate-200 bg-slate-50 p-4 text-left">
                    Room / Date
                  </th>

                  {days.map(day => (
                    <th
                      key={day}
                      className="min-w-[92px] border-b border-r border-slate-200 p-3 text-center"
                    >
                      {label(day)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {grouped.map(group => (
                  <FragmentGroup
                    key={group.category}
                    category={group.category}
                    rooms={group.rooms}
                    days={days}
                    reservationFor={reservationFor}
                    blocked={blocked}
                    rateFor={rateFor}
                    selected={selected}
                    toggle={toggle}
                    selectCategory={selectCategory}
                    showGuest={setGuest}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <p className="p-6 text-center text-sm text-slate-500">
              Loading inventory...
            </p>
          )}
        </section>

        <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="font-bold">Bulk Actions</h3>
            <p className="mt-1 text-xs text-slate-500">
              {selected.size} room dates selected
            </p>

            <div className="mt-3 flex items-center gap-2">
              <label htmlFor="bulk-rate" className="text-xs text-slate-600">
                Nightly Rate
              </label>

              <input
                id="bulk-rate"
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
            >
              Clear
            </button>

            <button
              disabled={saving || !selected.size}
              onClick={() => void applySalesStop(false)}
              className="flex items-center gap-2 rounded-lg border border-teal-200 px-4 py-2.5 text-sm font-semibold text-teal-700 disabled:opacity-40"
            >
              <UnlockKeyhole size={16} />
              Open Sales
            </button>

            <button
              disabled={saving || !selected.size}
              onClick={() => void applySalesStop(true)}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-40"
            >
              <LockKeyhole size={16} />
              Stop Sales
            </button>

            <button
              disabled={saving || !selected.size}
              onClick={() => void applyRates()}
              className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Save size={16} />
              Apply Rate
            </button>
          </div>
        </section>
      </main>

      {guest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Reservation Details</h3>

              <button
                onClick={() => setGuest(null)}
                aria-label="Close reservation details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              {[
                ["Booking ID", `#${guest.id}`],
                ["Guest", guest.guest],
                ["Email", guest.email],
                ["Room", guest.room_name || `Room #${guest.room_id}`],
                ["Check-in", guest.check_in],
                ["Check-out", guest.check_out],
                ["Status", guest.status]
              ].map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-slate-500">{key}</span>
                  <span className="text-right font-semibold">{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setGuest(null)}
              className="mt-6 w-full rounded-xl bg-teal-700 py-3 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentGroup({
  category,
  rooms,
  days,
  reservationFor,
  blocked,
  rateFor,
  selected,
  toggle,
  selectCategory,
  showGuest
}: {
  category: string;
  rooms: Room[];
  days: string[];
  reservationFor: (roomId: number, day: string) => Reservation | undefined;
  blocked: (roomId: number, day: string) => boolean;
  rateFor: (roomId: number, day: string) => number | undefined;
  selected: Set<string>;
  toggle: (roomId: number, day: string) => void;
  selectCategory: (rooms: Room[], day: string) => void;
  showGuest: (reservation: Reservation) => void;
}) {
  return (
    <>
      <tr className="bg-slate-100">
        <th
          colSpan={days.length + 1}
          className="border-b border-slate-200 px-4 py-3 text-left font-bold"
        >
          <BedDouble size={15} className="mr-2 inline" />
          {category}
          <span className="ml-2 font-normal text-slate-400">
            {rooms.length} rooms
          </span>
        </th>
      </tr>

      <tr className="bg-white">
        <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-3 text-left font-semibold">
          Available
        </th>

        {days.map(day => {
          const available = rooms.filter(
            room =>
              !reservationFor(room.id, day) &&
              !blocked(room.id, day)
          ).length;

          return (
            <td key={day} className="border-b border-r border-slate-200 p-1.5 text-center">
              <button
                onClick={() => selectCategory(rooms, day)}
                className="w-full rounded-lg bg-emerald-50 px-2 py-3 font-bold text-emerald-800 hover:bg-emerald-100"
              >
                {available} / {rooms.length}
              </button>
            </td>
          );
        })}
      </tr>

      <tr className="bg-white">
        <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-3 text-left font-semibold">
          Rate Range
        </th>

        {days.map(day => {
          const values = rooms
            .map(room => rateFor(room.id, day))
            .filter((value): value is number => value !== undefined);

          const min = values.length ? Math.min(...values) : undefined;

          return (
            <td key={day} className="border-b border-r border-slate-200 bg-amber-50/40 p-2 text-center font-semibold">
              {min === undefined ? "—" : min.toLocaleString("en-US")}
            </td>
          );
        })}
      </tr>

      {rooms.map(room => (
        <tr key={room.id}>
          <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-3 text-left">
            <span className="font-semibold">{room.name}</span>
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              {category}
            </span>
          </th>

          {days.map(day => {
            const reservation = reservationFor(room.id, day);
            const isBlocked = blocked(room.id, day);
            const isSelected = selected.has(`${room.id}|${day}`);
            const rate = rateFor(room.id, day);

            return (
              <td key={day} className="border-b border-r border-slate-200 p-1">
                {reservation ? (
                  <button
                    onClick={() => showGuest(reservation)}
                    className="flex h-[76px] w-full flex-col items-center justify-center rounded-lg bg-blue-50 p-1 text-blue-800 hover:bg-blue-100"
                  >
                    <Users size={15} />
                    <span className="mt-1 max-w-[76px] truncate text-[11px] font-bold">
                      {reservation.guest || "Reserved"}
                    </span>
                    <span className="text-[10px]">Reserved</span>
                  </button>
                ) : (
                  <button
                    onClick={() => toggle(room.id, day)}
                    className={`flex h-[76px] w-full flex-col items-center justify-center rounded-lg border p-1 ${
                      isSelected
                        ? "border-teal-500 bg-teal-100 ring-1 ring-teal-400"
                        : isBlocked
                          ? "border-red-100 bg-red-50 text-red-700"
                          : "border-transparent bg-teal-50 text-teal-800"
                    }`}
                  >
                    {isSelected ? (
                      <Check size={16} />
                    ) : isBlocked ? (
                      <LockKeyhole size={15} />
                    ) : (
                      <UnlockKeyhole size={15} />
                    )}

                    <span className="mt-1 text-[11px] font-bold">
                      {isBlocked ? "Blocked" : "Open"}
                    </span>

                    <span className="mt-1 text-[10px]">
                      {rate === undefined
                        ? "No rate"
                        : rate.toLocaleString("en-US")}
                    </span>
                  </button>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
