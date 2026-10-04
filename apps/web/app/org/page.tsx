"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import { useAuth } from "../../lib/auth-context";
import { DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from "../../lib/api-config";
import { userFacingMessage, UserFacingError, serverErrorMessage } from '../../lib/friendly-error';

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  role: "OWNER" | "ADMIN" | "MEMBER";
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * SEC-02 step 3 — this file used to hand-build its own Bearer by reading
 * `localStorage['poojly_session'].accessToken` (and an older `poojly_token`).
 *
 * Six files did that, and between them they are what kept the access token in
 * localStorage: lib/auth-context cannot stop WRITING it while surfaces outside
 * that module read it directly, because deleting the write logs each of them
 * out on the next page load. The token now has one owner — `useAuth()` — so
 * the write can be removed in one place instead of seven.
 *
 * `credentials: 'include'` is the other half, and it is not optional: the API
 * is a different ORIGIN (api.darshya.online), `fetch` defaults to
 * 'same-origin', and without this the httpOnly `darshya_session` cookie is
 * never sent — which is the credential a cookie-revived browser has INSTEAD of
 * a token. Same SITE, so SameSite=Lax still permits it. `fetchWithTimeout`
 * defaults that flag on, which is why it is used here rather than bare fetch.
 */
export default function OrgHubPage() {
  const { session, isLoading: authLoading } = useAuth();
  const token = session?.accessToken;

  const orgFetch = (path: string, init: RequestInit = {}) =>
    fetchWithTimeout(
      `${API}${path}`,
      {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          // Present only while a session still carries a JS-readable token
          // (mobile-shaped and transitional sessions). A cookie-revived
          // browser sends no Authorization header at all and the API's
          // `darshya_session` fallback answers instead.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      DATA_FETCH_TIMEOUT_MS,
    );
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await orgFetch("/api/v1/orgs/my");
      const j = await r.json();
      setOrgs(j.orgs ?? []);
    } catch (e) {
      setError(userFacingMessage(e, "Could not load your organisations. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  // Wait for auth-context to settle before the first load. `authHeader()` read
  // localStorage synchronously and so did not need to; `useAuth()` resolves
  // asynchronously (it may have to revive from the cookie), and firing before
  // it settles would send an anonymous request for a signed-in user.
  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, token]);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const r = await orgFetch("/api/v1/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, plan: "free" }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new UserFacingError(serverErrorMessage(j, "Could not create the organisation. Please try again."), r.status);
      }
      setName("");
      await load();
    } catch (e) {
      setError(userFacingMessage(e, "That did not work. Please try again."));
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className={`${H1.portal} mb-6`}>Your Organizations</h1>

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
            className={buttonClass('primary', 'md')}
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
