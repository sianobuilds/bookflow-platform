"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck2,
  Users,
  Settings,
  BedDouble,
  UtensilsCrossed,
  Scissors,
  Sparkles,
  CalendarDays,
  Building2,
  ClipboardList,
  BadgeDollarSign,
  type LucideIcon
} from "lucide-react";

type Account = {
  id?: string;
  email?: string;
  businessName?: string;
  industry?: string;
};

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const commonTop: MenuItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Reservations", href: "/reservations", icon: CalendarCheck2 },
  { label: "Customers", href: "/customers", icon: Users }
];

const industryMenus: Record<string, MenuItem[]> = {
  accommodation: [
    { label: "Room Inventory", href: "/rooms", icon: BedDouble },
    { label: "Room Rates", href: "/settings?tab=rates", icon: BadgeDollarSign }
  ],
  restaurant: [
    { label: "Table Management", href: "/settings?tab=resources", icon: UtensilsCrossed },
    { label: "Menu & Services", href: "/settings?tab=services", icon: ClipboardList }
  ],
  hair: [
    { label: "Stylist Management", href: "/settings?tab=resources", icon: Scissors },
    { label: "Hair Services", href: "/settings?tab=services", icon: ClipboardList }
  ],
  beauty: [
    { label: "Treatment Rooms", href: "/settings?tab=resources", icon: Sparkles },
    { label: "Beauty Services", href: "/settings?tab=services", icon: ClipboardList }
  ]
};

const commonBottom: MenuItem[] = [
  { label: "Settings", href: "/settings", icon: Settings }
];

export default function BookFlowSidebar() {
  const pathname = usePathname();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store"
        });

        if (!response.ok) {
          if (active) setAccount(null);
          return;
        }

        const data = await response.json();

        if (active) {
          setAccount(data.account ?? data.user ?? null);
        }
      } catch {
        if (active) setAccount(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [pathname]);

  const industry = account?.industry?.toLowerCase() || "";

  const items: MenuItem[] = [
    ...commonTop,
    ...(industryMenus[industry] || []),
    ...commonBottom
  ];

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:min-h-screen lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-100 px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
            <CalendarDays size={21} />
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              BookFlow
            </p>
            <p className="text-xs text-slate-400">
              Business Management
            </p>
          </div>
        </Link>
      </div>

      <div className="px-5 pt-5">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Building2 size={14} />
            Business Workspace
          </div>

          <p className="mt-2 truncate text-sm font-semibold text-slate-900">
            {loading
              ? "Loading..."
              : account?.businessName || "BookFlow Workspace"}
          </p>

          <p className="mt-1 text-xs capitalize text-teal-700">
            {loading
              ? "Checking business..."
              : industry || "Select a business"}
          </p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-4 pt-6 lg:flex-col lg:gap-2">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(item.href.split("?")[0] + "/");

          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              ].join(" ")}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
