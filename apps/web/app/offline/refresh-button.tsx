"use client";

// Extracted from /offline/page.tsx so the page can stay a Server Component
// (it exports `metadata` + uses `revalidate` for SSG). A <button onClick> in a
// server component is a build error ("Event handlers cannot be passed to
// Client Component props"), so the one interactive element lives here.

import { RefreshCw } from "lucide-react";

export default function RefreshButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.location.reload();
      }}
      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-saffron-600 hover:bg-saffron-700 text-white font-medium transition-colors"
    >
      <RefreshCw className="w-4 h-4" aria-hidden="true" />
      Try again
    </button>
  );
}
