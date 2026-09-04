import { adminApiBase, adminApiHeaders } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { RefundActions } from "./refund-actions";
import { H1 } from "../../components/ui/heading-recipe";

export const revalidate = 60;

interface RefundBooking {
  id: string;
  bookingNumber: string;
  status: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  priceAmount: string | number;
  currency: string;
  pujaType: { name: string; slug: string } | null;
  temple: { name: string; slug: string; city: string | null } | null;
  user: { fullName: string; phone: string | null } | null;
  payments: { id: string; status: string; amount: string | number }[];
}

interface RefundResult {
  status: "ok" | "error";
  bookings: RefundBooking[];
  schemaNote?: string;
  message?: string;
}

async function fetchRefunds(): Promise<RefundResult> {
  try {
    const res = await fetch(`${adminApiBase()}/api/v1/admin/bookings/refunds/pending`, {
      headers: adminApiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", bookings: [], message: `API ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { bookings?: RefundBooking[]; schemaNote?: string };
    return { status: "ok", bookings: json.bookings ?? [], schemaNote: json.schemaNote };
  } catch (err) {
    return { status: "error", bookings: [], message: err instanceof Error ? err.message : String(err) };
  }
}

export default async function RefundsPage() {
  const result = await fetchRefunds();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className={H1.portal}>
          Pending refunds
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Cancelled bookings whose payment is still captured. Refreshes every 60s.
        </p>
        {result.schemaNote ? (
          <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Schema gap: {result.schemaNote}
          </p>
        ) : null}
      </header>

      {result.status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Could not load refunds</p>
          <p className="mt-1">{result.message}</p>
        </div>
      ) : result.bookings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No pending refunds.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">BS number</th>
                <th className="px-4 py-3 font-semibold">Devotee</th>
                <th className="px-4 py-3 font-semibold">Puja</th>
                <th className="px-4 py-3 font-semibold">Cancelled</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {result.bookings.map((b) => (
                <tr key={b.id} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-mono text-xs text-stone-700">{b.bookingNumber}</td>
                  <td className="px-4 py-2 text-stone-900">{b.user?.fullName ?? "—"}</td>
                  <td className="px-4 py-2 text-stone-700">{b.pujaType?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-stone-700">
                    {b.cancelledAt ? new Date(b.cancelledAt).toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-2 text-stone-700">{b.cancellationReason ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-mono text-stone-900">
                    {formatPrice(b.priceAmount, b.currency)}
                  </td>
                  <td className="px-4 py-2">
                    <RefundActions bookingId={b.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
