'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Renders children only after the component has mounted in the browser.
 * Use this around any node whose value differs between SSR and client —
 * `new Date()`, `Math.random()`, `localStorage`, `window.matchMedia` etc.
 *
 * The default `fallback` is null, which means the slot stays empty during SSR.
 * Pass a placeholder if you need to reserve layout space.
 */
export function ClientOnly({
 children,
 fallback = null,
}: {
 children: ReactNode;
 fallback?: ReactNode;
}) {
 const [mounted, setMounted] = useState(false);
 useEffect(() => setMounted(true), []);
 return <>{mounted ? children : fallback}</>;
}
