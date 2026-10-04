"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import { useAuth } from "../../../lib/auth-context";
import { DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from "../../../lib/api-config";
import { serverErrorMessage } from '../../../lib/friendly-error';

interface Member {
  id: string;
  user_id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  full_name: string | null;
  email: string | null;
  joined_at: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * SEC-02 step 3 — this file used to hand-build its own Bearer by reading
 * `localStorage['poojly_session'].accessToken` (and an older `poojly_token`).
 *
 * It was one of the last three doing so, and between them they are the whole
 * reason lib/auth-context still WROTE the access token to localStorage:
 * deleting the write logs each such surface out on its next load. With the
 * token owned by `useAuth()` alone, step 4 changes one file instead of seven.
 *
 * `credentials: 'include'` is the other half and is not optional: the API is a
 * different ORIGIN (api.darshya.online), `fetch` defaults to 'same-origin',
 * and without it the httpOnly `darshya_session` cookie — the credential a
 * cookie-revived browser has INSTEAD of a token — is never sent. Same SITE, so
 * SameSite=Lax still permits it. `fetchWithTimeout` defaults that flag on,
 * which is why it is used here rather than bare `fetch`.
 */
function OrgMembersContent() {
  const sp = useSearchParams();
  const orgId = sp.get("org");
  const { session, isLoading: authLoading } = useAuth();
  const accessToken = session?.accessToken;

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
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      },
      DATA_FETCH_TIMEOUT_MS,
    );
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    try {
      const r = await orgFetch(`/api/v1/orgs/${orgId}/members`);
      const j = await r.json();
      setMembers(j.members ?? []);
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
  }, [orgId, authLoading, accessToken]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setMsg(null);
    const r = await orgFetch(`/api/v1/orgs/${orgId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const j = await r.json();
    if (r.ok) {
      setEmail("");
      setMsg(`Invite sent to ${email}.`);
    } else {
      setMsg(serverErrorMessage(j, "That did not work. Please try again."));
    }
  }

  async function changeRole(userId: string, newRole: "OWNER" | "ADMIN" | "MEMBER") {
    if (!orgId) return;
    await orgFetch(`/api/v1/orgs/${orgId}/members/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    load();
  }

  async function remove(userId: string) {
    if (!orgId) return;
    if (!confirm("Remove this member?")) return;
    await orgFetch(`/api/v1/orgs/${orgId}/members/${userId}`, {
      method: "DELETE",
    });
    load();
  }

  if (!orgId) {
    return <main className="p-10">Missing ?org=&lt;id&gt;</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className={`${H1.portal} mb-6`}>Members</h1>

      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-3">Invite teammate</h2>
        <form onSubmit={invite} className="flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="trustee@trust.org"
            className="flex-1 min-w-[220px] rounded border px-3 py-2"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
            className="rounded border px-3 py-2"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className={buttonClass('primary', 'md')}>
            Send invite
          </button>
        </form>
        {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
      </section>

      <section className="rounded-lg border bg-white p-6">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2">{m.full_name ?? "—"}</td>
                  <td>{m.email ?? "—"}</td>
                  <td>
                    <select
                      value={m.role}
                      onChange={(e) =>
                        changeRole(m.user_id, e.target.value as "OWNER" | "ADMIN" | "MEMBER")
                      }
                      className="rounded border px-2 py-1"
                    >
                      <option>OWNER</option>
                      <option>ADMIN</option>
                      <option>MEMBER</option>
                    </select>
                  </td>
                  <td>{new Date(m.joined_at).toLocaleDateString()}</td>
                  <td>
                    {m.role !== "OWNER" && (
                      <button
                        onClick={() => remove(m.user_id)}
                        className="text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default function OrgMembersPage() {
  return (
    <Suspense fallback={<main className="p-10">Loading…</main>}>
      <OrgMembersContent />
    </Suspense>
  );
}
