"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import { useAuth } from "../../../lib/auth-context";
import { DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from "../../../lib/api-config";

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
function OrgSettingsContent() {
  const sp = useSearchParams();
  const orgId = sp.get("org");
  const { session, isLoading: authLoading } = useAuth();
  const accessToken = session?.accessToken;
  const [status, setStatus] = useState<PlanStatus | null>(null);

  // Wait for auth-context to settle before the first load. `authHeader()` read
  // localStorage synchronously and so did not need to; `useAuth()` resolves
  // asynchronously (it may have to revive from the cookie), and firing before
  // it settles would send an anonymous request for a signed-in user — which on
  // this page silently renders the plan card as absent rather than as unknown.
  useEffect(() => {
    if (!orgId) return;
    if (authLoading) return;
    fetchWithTimeout(
      `${API}/api/v1/orgs/${orgId}/plan-status`,
      {
        headers: {
          // Present only while a session still carries a JS-readable token
          // (mobile-shaped and transitional sessions). A cookie-revived
          // browser sends no Authorization header at all and the API's
          // `darshya_session` fallback answers instead.
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      },
      DATA_FETCH_TIMEOUT_MS,
    )
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [orgId, authLoading, accessToken]);

  if (!orgId) return <main className="p-10">Missing ?org=&lt;id&gt;</main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className={`${H1.portal} mb-6`}>Org Settings</h1>

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
                className={buttonClass('primary', 'md', 'mt-4 w-full')}
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
