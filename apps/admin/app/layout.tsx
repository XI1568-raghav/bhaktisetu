import type { Metadata } from "next";
import "./globals.css";
import { AdminNav } from "../components/admin-nav";

export const metadata: Metadata = {
  title: "Darshya Admin",
  description: "Internal admin dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <AdminNav />
        {children}
      </body>
    </html>
  );
}
