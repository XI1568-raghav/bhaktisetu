"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

interface Member {
  id: string;
  user_id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  full_name: string | null;
  email: string | null;
  joined_at: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function authHeader(): HeadersInit {
  if (typeof window === "undefined") return {};
  let token: string | null = null;
  try {
    const raw = window.localStorage.getItem("poojly_session");
    if (raw) token = JSON.parse(raw)?.accessToken ?? null;
  } catch {
    // ignore
  }
  if (!token) token = window.localStorage.getItem("poojly_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function OrgMembersContent() {
  const sp = useSearchParams();
  const orgId = sp.get("org");
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v1/orgs/${orgId}/members`, {
        headers: authHeader(),
      });
      const j = await r.json();
      setMembers(j.members ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [orgId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setMsg(null);
    const r = await fetch(`${API}/api/v1/orgs/${orgId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ email, role }),
    });
    const j = await r.json();
    if (r.ok) {
      setEmail("");
      setMsg(`Invite sent to ${email}.`);
    } else {
      setMsg(j.error || "Failed");
    }
  }

  async function changeRole(userId: string, newRole: "OWNER" | "ADMIN" | "MEMBER") {
    if (!orgId) return;
    await fetch(`${API}/api/v1/orgs/${orgId}/members/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ role: newRole }),
    });
    load();
  }

  async function remove(userId: string) {
    if (!orgId) return;
    if (!confirm("Remove this member?")) return;
    await fetch(`${API}/api/v1/orgs/${orgId}/members/${userId}`, {
      method: "DELETE",
      headers: authHeader(),
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
