import { adminApiBase, adminApiHeaders } from "../../lib/api";
import { formatPrice } from "../../lib/format";

export const revalidate = 60;

interface PayoutGroup {
  providerId: string;
  providerName: string;
  role: string;
  bookingsCount: number;
  totalPayout: number;
}

interface PayoutResult {
  status: "ok" | "error";
  groups: PayoutGroup[];
  schemaNote?: string;
  message?: string;
}

async function fetchPayouts(): Promise<PayoutResult> {
  try {
    const res = await fetch(`${adminApiBase()}/api/v1/admin/bookings/payouts/pending`, {
      headers: adminApiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", groups: [], message: `API ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { groups?: PayoutGroup[]; schemaNote?: string };
    return { status: "ok", groups: json.groups ?? [], schemaNote: json.schemaNote };
  } catch (err) {
    return { status: "error", groups: [], message: err instanceof Error ? err.message : String(err) };
  }
}

const SAFFRON = "#E16318";

export default async function PayoutsPage() {
  const result = await fetchPayouts();
  const totalOwed = result.groups.reduce((s, g) => s + g.totalPayout, 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl" style={{ color: SAFFRON }}>
          Pending payouts
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Aggregated by provider. PRIEST/WELLNESS net 75%, ASTROLOGER net 70%, GAUSHALA net 100%.
        </p>
        {result.schemaNote ? (
          <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Schema gap: {result.schemaNote}
          </p>
        ) : null}
      </header>

      {result.status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Could not load payouts</p>
          <p className="mt-1">{result.message}</p>
        </div>
      ) : result.groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No pending payouts.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Provider</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 text-right font-semibold">Bookings</th>
                <th className="px-4 py-3 text-right font-semibold">Total owed</th>
              </tr>
            </thead>
            <tbody>
              {result.groups.map((g) => (
                <tr key={`${g.role}-${g.providerId}`} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-medium text-stone-900">{g.providerName}</td>
                  <td className="px-4 py-2 text-stone-700">{g.role}</td>
                  <td className="px-4 py-2 text-right font-mono text-stone-900">{g.bookingsCount}</td>
                  <td className="px-4 py-2 text-right font-mono text-stone-900">{formatPrice(g.totalPayout)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-200 bg-stone-50">
                <td className="px-4 py-2 font-semibold text-stone-900" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-stone-900">
                  {formatPrice(totalOwed)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  );
}
