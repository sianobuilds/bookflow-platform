"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleCheck, LogOut, UserRound } from "lucide-react";

type Account = {
  id: string;
  email: string;
  businessName: string;
  industry: string;
};

const labels: Record<string, string> = {
  accommodation: "Accommodation",
  restaurant: "Restaurant",
  hair: "Hair Salon",
  beauty: "Beauty Studio"
};

export default function BookFlowAccount() {
  const pathname = usePathname();
  const router = useRouter();

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      setLoading(true);

      try {
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store"
        });

        const data = await response.json();

        if (active) {
          setAccount(response.ok ? data.account : null);
        }
      } catch {
        if (active) setAccount(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin"
      });

      if (!response.ok) throw new Error("Logout failed");

      setAccount(null);
      router.replace("/login");
      router.refresh();
    } catch {
      window.alert("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        Checking account...
      </div>
    );
  }

  if (!account) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm text-slate-500">
          Not signed in
        </p>

        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-teal-50 p-2 text-teal-700">
          <UserRound size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {account.businessName}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {account.email}
          </p>

          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-teal-700">
            <CircleCheck size={13} />
            Signed in · {labels[account.industry] || account.industry}
          </p>
        </div>
      </div>

      <button
        onClick={logout}
        disabled={loggingOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        <LogOut size={16} />
        {loggingOut ? "Logging out..." : "Log Out"}
      </button>
    </div>
  );
}
