import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff, Home, Flame } from "lucide-react";
import RefreshButton from "./refresh-button";
import OnlineRecovery from "./online-recovery";
import { H1 } from '../../components/ui/heading-recipe';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Offline",
  description:
    "You appear to be offline. Reconnect to load live darshan, book pujas, or browse temples on Darshya.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="min-h-[100dvh] bg-surface-50 flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full bg-white border border-surface-200 rounded-xl p-8 sm:p-12 shadow-sm text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-saffron-50 border border-saffron-200 flex items-center justify-center mb-6">
          <WifiOff className="w-8 h-8 text-saffron-600" aria-hidden="true" />
        </div>

        <h1 className={`${H1.catalogue} mb-3`}>
          You are offline
        </h1>

        <p className="text-surface-700 leading-relaxed mb-6">
          Darshya needs an internet connection for live darshan streams,
          puja booking, and live panchang updates. Reconnect and try again.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-left">
          <div className="flex gap-3">
            <Flame
              className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Aaj ka mantra</p>
              <p className="text-amber-800 leading-relaxed">
                Om Sarve Bhavantu Sukhinah, Sarve Santu Niramayah —
                may all beings be happy, may all beings be free from illness.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <RefreshButton />
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-surface-300 hover:border-surface-400 bg-white text-surface-800 font-medium transition-colors"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Go home
          </Link>
        </div>

        {/* RES-13: the shell used to be terminal — the service worker served it
            on a failed navigation and nothing ever re-issued the request, so
            the devotee sat here after the connection came back until they
            reloaded by hand. This listens for the browser's `online` event and
            reloads, which fetches the route still in the address bar. */}
        <OnlineRecovery />

        <p className="text-xs text-surface-500 mt-8">
          Some pages may still load from your device&apos;s cache. Tap any
          link in the navigation to try.
        </p>
      </div>
    </main>
  );
}
