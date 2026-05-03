"use client";
export const runtime = 'edge';

import { useEffect, useState } from "react";
import Link from "next/link";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  role: "OWNER" | "ADMIN" | "MEMBER";
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function authHeader(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("poojly_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function OrgHubPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v1/orgs/my`, { headers: authHeader() });
      const j = await r.json();
      setOrgs(j.orgs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/v1/orgs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ name, plan: "free" }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create org");
      }
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Your Organizations</h1>

      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-3">Create new org</h2>
        <p className="text-sm text-gray-600 mb-4">
          For Temple Trusts, multi-temple operators, and devotional organizations.
        </p>
        <form onSubmit={createOrg} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shri Mahakaleshwar Trust"
            className="flex-1 rounded border px-3 py-2"
            required
            minLength={2}
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Memberships</h2>
        {loading ? (
          <p>Loading...</p>
        ) : orgs.length === 0 ? (
          <p className="text-gray-500">You haven't joined any orgs yet.</p>
        ) : (
          <ul className="divide-y">
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{o.name}</div>
                  <div className="text-xs text-gray-500">
                    {o.slug} · {o.plan} plan · {o.role}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/org/members?org=${o.id}`}
                    className="rounded border px-3 py-1 text-sm"
                  >
                    Members
                  </Link>
                  <Link
                    href={`/org/settings?org=${o.id}`}
                    className="rounded border px-3 py-1 text-sm"
                  >
                    Settings
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
