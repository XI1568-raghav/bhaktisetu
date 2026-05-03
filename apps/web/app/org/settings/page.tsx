"use client";
export const runtime = 'edge';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface PlanStatus {
  plan: "free" | "pro" | "enterprise";
  templeCount: number;
  templeLimit: number | null;
  atLimit: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const TIERS = [
  { id: "free", name: "Free", price: "₹0", limit: "1 temple", features: ["Basic dashboard", "1 admin"] },
  { id: "pro", name: "Pro", price: "₹2,999/mo", limit: "5 temples", features: ["Bookings analytics", "Unlimited members", "Email + WhatsApp invites"] },
  { id: "enterprise", name: "Enterprise", price: "Custom", limit: "Unlimited", features: ["Branded subdomain", "Priority support", "Custom integrations"] },
];

function authHeader(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("poojly_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function OrgSettingsContent() {
  const sp = useSearchParams();
  const orgId = sp.get("org");
  const [status, setStatus] = useState<PlanStatus | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch(`${API}/api/v1/orgs/${orgId}/plan-status`, { headers: authHeader() })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [orgId]);

  if (!orgId) return <main className="p-10">Missing ?org=&lt;id&gt;</main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Org Settings</h1>

      {status && (
        <div className="mb-6 rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-2">Current plan</h2>
          <p>
            <strong className="capitalize">{status.plan}</strong> · {status.templeCount} of{" "}
            {status.templeLimit ?? "∞"} temples used
          </p>
          {status.atLimit && (
            <p className="mt-2 text-sm text-orange-700">
              You've reached your plan's temple limit. Upgrade to add more.
            </p>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Plans</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border bg-white p-6 ${
              status?.plan === t.id ? "ring-2 ring-orange-600" : ""
            }`}
          >
            <h3 className="text-xl font-bold">{t.name}</h3>
            <p className="text-2xl font-semibold mt-1">{t.price}</p>
            <p className="text-sm text-gray-500">{t.limit}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {t.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            {status?.plan !== t.id && (
              <button
                className="mt-4 w-full rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
                onClick={() => alert("Upgrade flow uses /api/v1/subscriptions Razorpay endpoint.")}
              >
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

export default function OrgSettingsPage() {
  return (
    <Suspense fallback={<main className="p-10">Loading…</main>}>
      <OrgSettingsContent />
    </Suspense>
  );
}
