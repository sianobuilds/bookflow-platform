
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Account = {
  email?: string;
  businessName?: string;
};

export default function BookFlowAccountHeader() {
  const pathname = usePathname();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.account ?? data.user ?? null;
      })
      .then((value) => {
        if (active) setAccount(value);
      })
      .catch(() => {
        if (active) setAccount(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      window.location.href = "/login";
    } catch {
      alert("Logout failed. Please try again.");
    }
  }

  const name =
    account?.email?.split("@")[0] ||
    account?.businessName ||
    "User";

  return (
    <header className="flex min-h-16 w-full items-center justify-end gap-4 border-b border-slate-200 bg-white px-6">
      {loading ? (
        <span className="text-sm text-slate-400">
          Checking account...
        </span>
      ) : account ? (
        <>
          <a
            href="/settings"
            className="text-sm font-semibold text-slate-800 hover:text-teal-700"
          >
            {name}님
          </a>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log Out
          </button>
        </>
      ) : (
        <a
          href="/login"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Log In
        </a>
      )}
    </header>
  );
}
