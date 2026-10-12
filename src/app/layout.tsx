import BookFlowAccountHeader from "@/components/bookflow-account-header";
import type { Metadata } from "next";
import "./globals.css";
import BookFlowShell from "@/components/bookflow-shell";

export const metadata: Metadata = {
  title: "BookFlow | Reservation Management",
  description: "Booking and inventory management platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <BookFlowShell>
          <div className="flex min-w-0 flex-1 flex-col"><BookFlowAccountHeader />{children}</div>
        </BookFlowShell>
      </body>
    </html>
  );
}
