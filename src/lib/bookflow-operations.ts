import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type Resource = {
  id: string;
  businessId: string;
  name: string;
  capacity: number;
  active: boolean;
};

export type Service = {
  id: string;
  businessId: string;
  name: string;
  duration: number;
  price: number;
  active: boolean;
};

export type Booking = {
  id: string;
  businessId: string;
  resourceId: string;
  serviceId: string;
  customer: string;
  email: string;
  start: string;
  end: string;
  partySize: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
};

export type Rate = {
  id: string;
  businessId: string;
  resourceId: string;
  date: string;
  price: number;
};

export type Store = {
  resources: Resource[];
  services: Service[];
  bookings: Booking[];
  rates: Rate[];
};

const file = path.join(
  process.cwd(),
  ".bookflow-data",
  "operations.json"
);

const empty = (): Store => ({
  resourceimport "server-only[],
  bookings: [],
  rates: []
});

export function readStore(): Store {
  if (!fs.existsSync(file)) return empty();

  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  return {
    resources: Array.isArray(data.resources) ? data.resources : [],
    services: Array.isArray(data.services) ? data.services : [],
    bookings: Array.isArray(data.bookings) ? data.bookings : [],
    rates: Array.isArray(data.rates) ? data.rates : []
  };
}

export function writeStore(store: Store) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const temp = file + "." + crypto.randomUUID() + ".tmp";

  fs.writeFileSync(temp, JSON.stringify(store, null, 2), {
    mode: 0o600
  });

  fs.renameSync(temp, file);
}

export const newId = () => crypto.randomUUID();

export function validStart(value: unknown) {
  if (typeof value !== "string") return f};

co  if (-f\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

export function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  return Date.parse(startA) < Date.parse(endB) &&
    Date.parse(startB) < Date.parse(endA);
}

export function bookingConflict(
  store: Store,
  businessId: string,
  resourceId: string,
  start: string,
  end: string
) {
  return store.bookings.some(b =>
    b.businessId === businessId &&
    b.resourceId === resourceId &&
    b.status === "confirmed" &&
    overlaps(start, end, b.start, b.end)
  );
}

export function safeText(value: unknown, max = 100) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}
