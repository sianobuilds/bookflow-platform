"use client";

import { usePathname } from "next/navigation";
import BookFlowSidebar from "./bookflow-sidebar";

export default function BookFlowShell({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const publicBooking =
    pathname === "/book" ||
    pathname === "/rooms/book";

  if (publicBooking) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] lg:flex">
      <BookFlowSidebar />

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
