"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Save,
  RefreshCw,
  CalendarRange
} from "lucide-react";

type Room = {
  id: number;
  name: string;
  category: string;
};

type Rate = {
  room_id: number;
  day: string;
  price: number;
};

function iso(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function addDays(value: string, count: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + count);
  return iso(date);
}

export default function RateManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [start, setStart] = useState(() => iso(new Date()));
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [price, setPrice] = useState("120000");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const days = Array.from(
    { length: 14 },
    (_, index) => addDays(start, index)
  );

  async function load() {
    try {
      const [roomsResponse, ratesResponse] = await Promise.all([
        fetch("/api/inventory/rooms", { cache: "no-store" }),
        fetch(
          `/api/rates?start=${start}&end=${addDays(start, 14)}`,
          { cache: "no-store" }
        )
      ]);

      if (!roomsResponse.ok || !ratesResponse.ok) {
        throw new Error("Unable to load rate data");
      }

      const roomData = await roomsResponse.json();
      const rateData = await ratesResponse.json();

      setRooms(roomData);
      setRates(rateData.rates ?? []);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Loading failed"
      );
    }
  }

  useEffect(() => {
    void load();
  }, [start]);

  function toggleRoom(id: number) {
    setSelectedRooms(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id]
    );
  }

  function toggleDay(day: string) {
    setSelectedDays(current =>
      current.includes(day)
        ? current.filter(value => value !== day)
        : [...current, day]
    );
  }

  async function saveRates() {
    const amount = Number(price);

    if (
      selectedRooms.length === 0 ||
      selectedDays.length === 0
    ) {
      setMessage("Select rooms and dates first.");
      return;
    }

    if (!Number.isSafeInteger(amount) || amount < 0) {
      setMessage("Enter a valid non-negative price.");
      return;
    }

    setLoading(true);

    try {
      // Save only selected dates, not unselected dates between them.
      for (const day of selectedDays) {
        const response = await fetch("/api/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_ids: selectedRooms,
            start: day,
            end: addDays(day, 1),
            price: amount
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Save failed");
        }
      }

      await load();

      setMessage(
        `Saved ${selectedRooms.length * selectedDays.length} room rates.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Save failed"
      );
    } finally {
      setLoading(false);
    }
  }

  function rateFor(roomId: number, day: string) {
    return rates.find(
      rate => rate.room_id === roomId && rate.day === day
    );
  }

  const grouped = Object.entries(
    rooms.reduce<Record<string, Room[]>>((acc, room) => {
      (acc[room.category] ??= []).push(room);
      return acc;
    }, {})
  );

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <DollarSign size={20} className="text-teal-700" />
            Room Rate Management
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Select rooms and dates to update nightly rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={start}
            onChange={event => setStart(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />

          <button
            onClick={() => void load()}
            aria-label="Refresh rates"
            className="rounded-lg border border-slate-200 p-2.5"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1250px] border-collapse text-center text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 min-w-[200px] border-b border-r border-slate-200 bg-slate-50 p-4 text-left">
                Room / Date
              </th>

              {days.map(day => (
                <th
                  key={day}
                  className="min-w-[90px] border-b border-r border-slate-200 p-2"
                >
                  <button
                    onClick={() => toggleDay(day)}
                    className={`w-full rounded-lg p-2 ${
                      selectedDays.includes(day)
                        ? "bg-teal-700 text-white"
                        : "hover:bg-teal-50"
                    }`}
                  >
                    <CalendarRange size={14} className="mx-auto mb-1" />
                    {day.slice(5)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {grouped.map(([category, categoryRooms]) => (
              <ReactFragmentGroup
                key={category}
                category={category}
                rooms={categoryRooms}
                days={days}
                selectedRooms={selectedRooms}
                selectedDays={selectedDays}
                toggleRoom={toggleRoom}
                rateFor={rateFor}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 bg-slate-50 p-5">
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-600">
            Nightly Rate
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={event => setPrice(event.target.value)}
            className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />

          <p className="mt-2 text-xs text-slate-500">
            {selectedRooms.length} rooms × {selectedDays.length} dates
          </p>
        </div>

        <button
          disabled={loading}
          onClick={() => void saveRates()}
          className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save size={17} />
          {loading ? "Saving..." : "Apply Rates"}
        </button>
      </div>

      {message && (
        <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          {message}
        </p>
      )}
    </section>
  );
}

function ReactFragmentGroup({
  category,
  rooms,
  days,
  selectedRooms,
  selectedDays,
  toggleRoom,
  rateFor
}: {
  category: string;
  rooms: Room[];
  days: string[];
  selectedRooms: number[];
  selectedDays: string[];
  toggleRoom: (id: number) => void;
  rateFor: (roomId: number, day: string) => Rate | undefined;
}) {
  return (
    <>
      <tr className="bg-slate-100">
        <th
          colSpan={days.length + 1}
          className="border-b border-slate-200 px-4 py-3 text-left font-bold"
        >
          {category}
          <span className="ml-2 font-normal text-slate-400">
            {rooms.length} rooms
          </span>
        </th>
      </tr>

      {rooms.map(room => (
        <tr key={room.id}>
          <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-3 text-left">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedRooms.includes(room.id)}
                onChange={() => toggleRoom(room.id)}
                className="accent-teal-700"
              />
              <span>{room.name}</span>
            </label>
          </th>

          {days.map(day => {
            const rate = rateFor(room.id, day);

            return (
              <td
                key={day}
                className={`border-b border-r border-slate-200 p-2 ${
                  selectedRooms.includes(room.id) &&
                  selectedDays.includes(day)
                    ? "bg-teal-50"
                    : ""
                }`}
              >
                <span className="font-semibold text-slate-700">
                  {rate
                    ? rate.price.toLocaleString("en-US")
                    : "—"}
                </span>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
