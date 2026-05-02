import Link from "next/link";
import { adminApiBase, adminApiHeaders } from "../../lib/api";

export const dynamic = "force-dynamic";

interface TempleRow {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  timingInfo: unknown;
  updatedAt: string;
}

interface TempleListResult {
  status: "ok" | "error";
  temples: TempleRow[];
  message?: string;
}

async function fetchTemples(): Promise<TempleListResult> {
  try {
    const res = await fetch(`${adminApiBase()}/api/v1/admin/temple-timings/`, {
      headers: adminApiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", temples: [], message: `API ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { temples?: TempleRow[] };
    return { status: "ok", temples: json.temples ?? [] };
  } catch (err) {
    return { status: "error", temples: [], message: err instanceof Error ? err.message : String(err) };
  }
}

function regularHoursCount(timingInfo: unknown): number {
  if (!timingInfo || typeof timingInfo !== "object") return 0;
  const t = timingInfo as { regularHours?: Record<string, string> };
  return t.regularHours ? Object.keys(t.regularHours).length : 0;
}

export default async function TemplesAdminPage() {
  const result = await fetchTemples();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Temple aarti timings</h1>
        <p className="mt-2 text-sm text-stone-600">
          Correct best-effort timings per temple. Each row links to the editor.
        </p>
      </header>

      {result.status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Could not load temples</p>
          <p className="mt-1">{result.message}</p>
        </div>
      ) : result.temples.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No temples found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Aarti slots</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {result.temples.map((t) => (
                <tr key={t.id} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-mono text-xs text-stone-700">{t.slug}</td>
                  <td className="px-4 py-2 font-medium text-stone-900">{t.name}</td>
                  <td className="px-4 py-2 text-stone-700">
                    {[t.city, t.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2 text-stone-700">{regularHoursCount(t.timingInfo)}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/temples/${encodeURIComponent(t.slug)}`}
                      className="rounded bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700"
                    >
                      Edit
                    </Link>
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
