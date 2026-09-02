import Link from "next/link";

const LINKS = [
  { href: "/funnel", label: "Funnel" },
  { href: "/retention", label: "Retention" },
  { href: "/experiments", label: "Experiments" },
  { href: "/bookings", label: "Bookings" },
  { href: "/payouts", label: "Payouts" },
  { href: "/refunds", label: "Refunds" },
  { href: "/leads", label: "Leads" },
  { href: "/leads-conversion", label: "Conversion" },
  { href: "/temples", label: "Temples" },
  { href: "/gurukuls", label: "Gurukuls" },
  { href: "/broadcast", label: "Broadcast" },
  { href: "/content-queue", label: "Content queue" },
  // TC-01: this read "80G export". No donation on the platform is 80G-eligible
  // — see the note on app/donations-export/page.tsx.
  { href: "/donations-export", label: "Donations export" },
];

export function AdminNav() {
  return (
    <nav
      className="border-b border-stone-200 bg-white"
      style={{ borderColor: "#E5E0D8" }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mr-3 text-sm font-bold tracking-tight"
          style={{ color: "#E16318" }}
        >
          Darshya admin
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded px-2.5 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
