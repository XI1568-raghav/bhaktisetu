"use client";

import { useState } from "react";

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

function clientApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  );
}

export function GurukulModerationClient({ initialRows }: { initialRows: GurukulRow[] }) {
  const [rows, setRows] = useState<GurukulRow[]>(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");

  async function toggleVerified(row: GurukulRow) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const res = await fetch(
        `${clientApiBase()}/api/v1/admin/gurukuls/${row.id}/verify`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isVerified: !row.isVerified }),
        },
      );
      if (!res.ok) {
        alert(`Update failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
        return;
      }
      const json = (await res.json()) as { gurukul: { isVerified: boolean } };
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, isVerified: json.gurukul.isVerified } : r,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(row: GurukulRow) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const res = await fetch(
        `${clientApiBase()}/api/v1/admin/gurukuls/${row.id}/active`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isActive: !row.isActive }),
        },
      );
      if (!res.ok) {
        alert(`Update failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
        return;
      }
      const json = (await res.json()) as { gurukul: { isActive: boolean } };
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, isActive: json.gurukul.isActive } : r,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  const visible =
    filter === "pending"
      ? rows.filter((r) => !r.isVerified)
      : filter === "verified"
        ? rows.filter((r) => r.isVerified)
        : rows;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        {(["all", "pending", "verified"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-md border px-3 py-1.5 font-medium capitalize ${
              filter === k
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {k} ({k === "all" ? rows.length : k === "pending" ? rows.filter((r) => !r.isVerified).length : rows.filter((r) => r.isVerified).length})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No gurukuls match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Tradition</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Programs</th>
                <th className="px-4 py-3 font-semibold">Verified</th>
                <th className="px-4 py-3 font-semibold">Active</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((g) => (
                <tr key={g.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900">{g.name}</div>
                    <div className="text-xs text-stone-500">{g.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{g.city}, {g.state}</td>
                  <td className="px-4 py-3 text-stone-700">{g.tradition}</td>
                  <td className="px-4 py-3 text-xs text-stone-700">
                    {g.ownerEmail ?? <span className="text-stone-400">— seed —</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{g.programCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        g.isVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {g.isVerified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        g.isActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {g.isActive ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleVerified(g)}
                        disabled={busyId === g.id}
                        className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                      >
                        {g.isVerified ? "Unverify" : "Verify"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(g)}
                        disabled={busyId === g.id}
                        className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                      >
                        {g.isActive ? "Hide" : "Show"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
