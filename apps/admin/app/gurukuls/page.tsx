import { adminApiBase, adminApiHeaders } from "../../lib/api";
import { GurukulModerationClient } from "./GurukulModerationClient";
import { H1 } from "../../components/ui/heading-recipe";

export const dynamic = "force-dynamic";

interface GurukulRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  tradition: string;
  isVerified: boolean;
  isActive: boolean;
  contactEmail: string;
  contactPhone: string | null;
  websiteUrl: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  programCount: number;
  createdAt: string;
}

interface FetchResult {
  status: "ok" | "error";
  gurukuls: GurukulRow[];
  message?: string;
}

async function fetchGurukuls(): Promise<FetchResult> {
  try {
    const res = await fetch(`${adminApiBase()}/api/v1/admin/gurukuls/?status=all`, {
      headers: adminApiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        status: "error",
        gurukuls: [],
        message: `API ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const json = (await res.json()) as { gurukuls?: GurukulRow[] };
    return { status: "ok", gurukuls: json.gurukuls ?? [] };
  } catch (err) {
    return {
      status: "error",
      gurukuls: [],
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function GurukulsAdminPage() {
  const result = await fetchGurukuls();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className={H1.portal}>Gurukul moderation</h1>
        <p className="mt-2 text-sm text-stone-600">
          Review owner-submitted gurukuls. Verified rows surface in the public directory.
        </p>
      </header>

      {result.status === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Could not load gurukuls</p>
          <p className="mt-1">{result.message}</p>
        </div>
      ) : (
        <GurukulModerationClient initialRows={result.gurukuls} />
      )}
    </main>
  );
}
