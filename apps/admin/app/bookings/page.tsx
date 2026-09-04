import { adminApiBase, adminApiHeaders } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { H1 } from "../../components/ui/heading-recipe";

export const revalidate = 60;

interface BookingRow {
  id: string;
  bookingNumber: string;
  status: string;
  scheduledDate: string;
  priceAmount: string | number;
  currency: string;
  pujaType: { name: string; slug: string } | null;
  temple: { name: string; slug: string; city: string | null } | null;
  user: { fullName: string; phone: string | null } | null;
}

interface ListResult {
  status: "ok" | "error";
  bookings: BookingRow[];
  total: number;
  message?: string;
}

async function fetchBookings(): Promise<ListResult> {
  try {
    const res = await fetch(`${adminApiBase()}/api/v1/admin/bookings/?limit=100`, {
      headers: adminApiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", bookings: [], total: 0, message: `API ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { bookings?: BookingRow[]; total?: number };
    return { status: "ok", bookings: json.bookings ?? [], total: json.total ?? 0 };
  } catch (err) {
    return { status: "error", bookings: [], total: 0, message: err instanceof Error ? err.message : String(err) };
  }
}

export default async function BookingsPage() {
  const result = await fetchBookings();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className={H1.portal}>
          Bookings
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Latest 100 puja bookings. Refreshes every 60s.
        </p>
      </header>

      {result.status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Could not load bookings</p>
          <p className="mt-1">{result.message}</p>
        </div>
      ) : result.bookings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No bookings yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">BS number</th>
                <th className="px-4 py-3 font-semibold">Devotee</th>
                <th className="px-4 py-3 font-semibold">Puja</th>
                <th className="px-4 py-3 font-semibold">Temple</th>
                <th className="px-4 py-3 font-semibold">Scheduled</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.bookings.map((b) => (
                <tr key={b.id} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-mono text-xs text-stone-700">{b.bookingNumber}</td>
                  <td className="px-4 py-2 text-stone-900">
                    {b.user?.fullName ?? "—"}
                    {b.user?.phone ? <span className="ml-2 font-mono text-xs text-stone-500">{b.user.phone}</span> : null}
                  </td>
                  <td className="px-4 py-2 text-stone-700">{b.pujaType?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-stone-700">
                    {b.temple?.name ?? "—"}
                    {b.temple?.city ? <span className="ml-1 text-xs text-stone-500">({b.temple.city})</span> : null}
                  </td>
                  <td className="px-4 py-2 text-stone-700">{new Date(b.scheduledDate).toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-right font-mono text-stone-900">
                    {formatPrice(b.priceAmount, b.currency)}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">
            Showing {result.bookings.length} of {result.total} total
          </p>
        </div>
      )}
    </main>
  );
}
