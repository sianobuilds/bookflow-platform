import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionAccount } from "@/lib/bookflow-auth";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TenantBooking = {
  id: string;
  businessId: string;
  name: string;
  email: string;
  service: string;
  date: string;
  time: string;
  status: "Confirmed" | "Cancelled";
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".bookflow-data");
const DATA_FILE = path.join(DATA_DIR, "tenant-bookings.json");

async function getAccount() {
  const store = await cookies();

  // Use the same session cookie as the existing auth routes.
  const names = ["bookflow_session", "bookflow-session", "session"];

  for (const name of names) {
    const token = store.get(name)?.value;
    const account = sessionAccount(token);
    if (account) return account;
  }

  return null;
}

async function readBookings(): Promise<TenantBooking[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data as TenantBooking[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function saveBookings(bookings: TenantBooking[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = DATA_FILE + "." + crypto.randomUUID() + ".tmp";
  await fs.writeFile(temp, JSON.stringify(bookings, null, 2), "utf8");
  await fs.rename(temp, DATA_FILE);
}

export async function GET() {
  try {
    const account = await getAccount();

    if (!account) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const bookings = await readBookings();

    return NextResponse.json({
      bookings: bookings.filter(b => b.businessId === account.id)
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const account = await getAccount();

    if (!account) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      typeof body.name !== "string" ||
      typeof body.email !== "string" ||
      typeof body.service !== "string" ||
      typeof body.date !== "string" ||
      typeof body.time !== "string" ||
      !body.name.trim() ||
      !body.email.trim() ||
      !body.service.trim() ||
      !body.date.trim() ||
      !body.time.trim()
    ) {
      return NextResponse.json(
        { error: "Invalid booking information" },
        { status: 400 }
      );
    }

    const booking: TenantBooking = {
      id: crypto.randomUUID(),
      businessId: account.id,
      name: body.name.trim(),
      email: body.email.trim(),
      service: body.service.trim(),
      date: body.date.trim(),
      time: body.time.trim(),
      status: "Confirmed",
      createdAt: new Date().toISOString()
    };

    const bookings = await readBookings();
    bookings.push(booking);
    await saveBookings(bookings);

    return NextResponse.json({ booking }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
