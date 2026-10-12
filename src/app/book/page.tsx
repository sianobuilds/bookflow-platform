"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, CheckCircle2, ArrowLeft
} from "lucide-react";
import {
  createBooking, getAvailability, Slot, services
} from "@/lib/bookings";

export default function BookingPage() {
  const [service, setService] = useState(services[0].name);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  useEffect(() => {
    if (!date) { setSlots([]); return; }
    getAvailability(date, service).then(setSlots).catch(() => setSlots([]));
  }, [date, service]);

  const today = new Date().toLocaleDateString("en-CA");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const booking = await createBooking({
        customer: customer.trim(),
        email: email.trim(),
        service, date, time
      });
      setSuccess(booking.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-5 md:px-10 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <CalendarDays className="text-teal-700"/> BookFlow
        </Link>
        <Link href="/" className="text-sm font-semibold text-teal-700">
          Admin Dashboard
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-12">
        <Link href="/" className="flex items-center gap-2 text-slate-500 text-sm mb-8">
          <ArrowLeft size={16}/> Back to Dashboard
        </Link>

        {success ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <CheckCircle2 size={52} className="text-teal-700 mx-auto mb-5"/>
            <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
            <p className="text-slate-500 mt-3">
              Your reservation has been successfully created.
            </p>
            <p className="text-xs text-slate-400 mt-4 break-all">
              Reference: {success}
            </p>
            <Link href="/"
              className="inline-block mt-8 bg-teal-700 text-white px-6 py-3 rounded-xl">
              View Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-teal-700 font-semibold text-sm mb-2">
                ONLINE RESERVATIONS
              </p>
              <h1 className="text-3xl font-bold">Book an Appointment</h1>
              <p className="text-slate-500 mt-2">
                Select your service and preferred time.
              </p>
            </div>

            <form onSubmit={submit}
              className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <label htmlFor="service" className="block font-semibold mb-2">
                  Select Service
                </label>
                <select id="service" value={service}
                  onChange={e => { setService(e.target.value); setTime(""); }}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-white">
                  {services.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} — ${s.price} / {s.duration} min
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="date" className="block font-semibold mb-2">
                    Preferred Date
                  </label>
                  <input id="date" type="date" required
                    min={today} value={date}
                    onChange={e => { setDate(e.target.value); setTime(""); }}
                    className="w-full border border-slate-200 rounded-xl p-3"/>
                </div>
                <div>
                  <label htmlFor="time" className="block font-semibold mb-2">
                    Available Time
                  </label>
                  <select id="time" required value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-white">
                    <option value="">Select a time</option>
                    {slots.filter(s => s.available).map(s =>
                      <option key={s.time} value={s.time}>{s.time}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="customer" className="block font-semibold mb-2">
                  Full Name
                </label>
                <input id="customer" required maxLength={100}
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border border-slate-200 rounded-xl p-3"/>
              </div>

              <div>
                <label htmlFor="email" className="block font-semibold mb-2">
                  Email Address
                </label>
                <input id="email" type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-slate-200 rounded-xl p-3"/>
              </div>

              {error && (
                <p role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  {error}
                </p>
              )}

              <button type="submit"
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl py-4">
                Confirm Booking
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
