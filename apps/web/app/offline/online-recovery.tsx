"use client";

/**
 * RES-13 — the offline shell now recovers on its own.
 *
 * When the service worker answers a failed navigation with this shell, the URL
 * stays on the route the user asked for. So a reload after the connection
 * returns fetches that route, not /offline — the user is put back where they
 * were rather than on a dead page they have to escape manually.
 *
 * `reload` is injectable so the behaviour can be asserted without a real
 * navigation; production passes nothing and gets window.location.reload().
 *
 * Why the reload is announced rather than silent: a page that reloads with no
 * warning reads as a crash. One line of polite status, then the navigation.
 */

import { useEffect, useState } from "react";
import { registerConnectivityListeners } from "../../lib/offline-recovery";

export default function OnlineRecovery({ reload }: { reload?: () => void }) {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    return registerConnectivityListeners({
      onOnline: () => {
        setRecovering(true);
        (reload ?? (() => window.location.reload()))();
      },
    });
  }, [reload]);

  if (!recovering) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
    >
      Back online — reloading the page you asked for…
    </div>
  );
}
