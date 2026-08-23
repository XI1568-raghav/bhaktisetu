"use client";

// Extracted from /offline/page.tsx so the page can stay a Server Component
// (it exports `metadata` + uses `revalidate` for SSG). A <button onClick> in a
// server component is a build error ("Event handlers cannot be passed to
// Client Component props"), so the one interactive element lives here.

import { RefreshCw } from "lucide-react";
import { buttonClass } from '../../components/ui/button-recipe';

export default function RefreshButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.location.reload();
      }}
      className={buttonClass('primary', 'md')}
    >
      <RefreshCw className="w-4 h-4" aria-hidden="true" />
      Try again
    </button>
  );
}
