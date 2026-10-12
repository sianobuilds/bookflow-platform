"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST"
    });

    if (!response.ok) return;

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
    >
      Log Out
    </button>
  );
}
