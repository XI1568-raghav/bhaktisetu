"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { H1 } from '../../../components/ui/heading-recipe';

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

function AcceptInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token");
  const [state, setState] = useState<"pending" | "ok" | "error">("pending");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch(
          `${API}/api/v1/orgs/accept-invite?token=${encodeURIComponent(token)}`,
          { method: "POST", headers: authHeader() },
        );
        const j = await r.json();
        if (!r.ok) {
          setError(j.error || "Failed");
          setState("error");
          return;
        }
        setState("ok");
        setTimeout(() => router.push("/org"), 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
        setState("error");
      }
    })();
  }, [token, router]);

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
