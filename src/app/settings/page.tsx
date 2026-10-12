import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  sessionAccount
} from "@/lib/bookflow-auth";
import LogoutButton from "../admin/logout-button";

const modules = {
  accommodation: [
    ["Room Inventory", "Manage rooms and availability", "/rooms"],
    ["Reservations", "Manage guest bookings", "/reservations"],
    ["Rate Management", "Manage nightly rates", ""],
    ["Guests", "Manage guest records", "/customers"]
  ],
  restaurant: [
    ["Table Management", "Tables and seating capacity", ""],
    ["Dining Reservations", "Guest bookings and arrivals", ""],
    ["Floor Plan", "Restaurant seating layout", ""],
    ["Service Hours", "Lunch and dinner schedules", ""]
  ],
  hair: [
    ["Stylist Schedule", "Stylist availability", ""],
    ["Appointments", "Manage bookings", ""],
    ["Services", "Cuts, color and treatments", ""],
    ["Customers", "Customer records", ""]
  ],
  beauty: [
    ["Artist Schedule", "Technician availability", ""],
    ["Appointments", "Manage bookings", ""],
    ["Treatments", "Nails, brows, lashes and skincare", ""],
    ["Customers", "Customer records", ""]
  ]
};

const labels = {
  accommodation: "Accommodation",
  restaurant: "Restaurant",
  hair: "Hair Salon",
  beauty: "Beauty Studio"
};

export default async function AdminPage() {
  const cookieStore = await cookies();

  const account = sessionAccount(
    cookieStore.get("bookflow_session")?.value
  );

  if (!account) redirect("/login");

  const items = modules[account.industry];

  return (
    <div className="min-h-screen bg-[#f6f8fa] p-5 text-slate-900 md:p-9">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
              BookFlow Business Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {account.businessName}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {labels[account.industry]} Management
            </p>
          </div>

          <LogoutButton />
        </header>

        <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold text-slate-500">
            CURRENT BUSINESS
          </p>

          <h2 className="mt-2 text-xl font-bold">
            {account.businessName}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {account.email}
          </p>

          <span className="mt-4 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
            {labels[account.industry]}
          </span>
        </section>

        <h2 className="mb-4 text-xl font-bold">
          Management Modules
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map(([name, description, href]) => (
            <div
              key={name}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h3 className="text-lg font-bold">{name}</h3>

              <p className="mt-2 text-sm text-slate-500">
                {description}
              </p>

              {href ? (
                <Link
                  href={href}
                  className="mt-5 inline-block text-sm font-semibold text-teal-700"
                >
                  Open Module →
                </Link>
              ) : (
                <span className="mt-5 inline-block rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
                  Planned
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
