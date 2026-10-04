"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { H1 } from '../../../components/ui/heading-recipe';
import { useAuth } from "../../../lib/auth-context";
import { DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from "../../../lib/api-config";
import { userFacingMessage, serverErrorMessage } from '../../../lib/friendly-error';

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
function AcceptInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();
  const accessToken = session?.accessToken;
  const token = sp.get("token");
  const [state, setState] = useState<"pending" | "ok" | "error">("pending");
  const [error, setError] = useState<string>("");
  const firedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    // `authHeader()` read localStorage synchronously so it never had to wait.
    // `useAuth()` resolves asynchronously — it may first have to revive from
    // the cookie — and accepting an invite anonymously burns the link.
    if (authLoading) return;
    if (firedRef.current) return;
    firedRef.current = true;
    (async () => {
      try {
        const r = await fetchWithTimeout(
          `${API}/api/v1/orgs/accept-invite?token=${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: {
              // Present only while a session still carries a JS-readable token
              // (mobile-shaped and transitional sessions). A cookie-revived
              // browser sends no Authorization header at all and the API's
              // `darshya_session` fallback answers instead.
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          },
          DATA_FETCH_TIMEOUT_MS,
        );
        const j = await r.json();
        if (!r.ok) {
          setError(serverErrorMessage(j, "Could not accept this invitation. Please try again."));
          setState("error");
          return;
        }
        setState("ok");
        setTimeout(() => router.push("/org"), 1200);
      } catch (e) {
        setError(userFacingMessage(e, "Could not accept this invitation. Please try again."));
        setState("error");
      }
    })();
    // `accessToken` is deliberately NOT a dependency. Accepting an invite is
    // not idempotent — a second POST answers "Expired"/already-a-member and
    // would flip a successful join into an error screen — and a token refresh
    // mid-flight would otherwise re-fire it. By the time `authLoading` is
    // false the session (and so the token) is already whatever it will be for
    // this attempt; `firedRef` makes that a once-only guarantee.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router, authLoading]);

  if (!token) return <p>Missing invite token.</p>;
  if (state === "pending") return <p>Joining org...</p>;
  if (state === "ok") return <p className="text-green-700">Joined! Redirecting...</p>;
  return (
    <p className="text-red-600">
      {error === "EmailMismatch"
        ? "This invite was issued to a different email. Sign in with the invited address."
        : error === "Expired"
          ? "This invite link has expired."
          : `Failed: ${error}`}
    </p>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className={`${H1.portal} mb-4`}>Accept invitation</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <AcceptInner />
      </Suspense>
    </main>
  );
}
