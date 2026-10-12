"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

type Room = {
  id: number;
  name: string;
  category: string;
};

function localDate(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

export default function RoomBookingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState(() => localDate(1));
  const [checkOut, setCheckOut] = useState(() => localDate(2));
  const [guest, setGuest] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/inventory/rooms")
      .then(r => r.json())
      .then((data: Room[]) => {
        if (!Array.isArray(data)) {
          setError("Could not load rooms");
          return;
        }
        setRooms(data);
        if (data.length) setRoomId(String(data[0].id));
      })
      .catch(() => setError("Could not load rooms"));
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/inventory/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: Number(roomId),
          guest,
          email,
          check_in: checkIn,
          check_out: checkOut
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Booking failed");
      }

      setSuccess(`Booking #${result.id} confirmed.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fb] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-xl">
        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 text-sm text-teal-700"
        >
          <ArrowLeft size={16} /> Room Inventory
        </Link>

        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-bold">Book a Room</h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose a room and your stay dates.
          </p>

          {success ? (
            <div className="mt-7 rounded-xl bg-teal-50 p-6 text-teal-800">
              <CheckCircle2 size={30} />
              <p className="mt-3 font-bold">{success}</p>
              <Link
                href="/rooms"
                className="mt-3 inline-block text-sm underline"
              >
                View inventory
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <label className="block text-sm font-medium">
                Room
                <select
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.category}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">
                  Check-in
                  <input
                    type="date"
                    value={checkIn}
                    min={localDate(0)}
                    onChange={e => setCheckIn(e.target.value)}
                    required
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Check-out
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn}
                    onChange={e => setCheckOut(e.target.value)}
                    required
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium">
                Guest Name
                <input
                  value={guest}
                  onChange={e => setGuest(e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                disabled={busy || !roomId}
                className="w-full rounded-xl bg-teal-700 py-3.5 font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Processing..." : "Confirm Booking"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
