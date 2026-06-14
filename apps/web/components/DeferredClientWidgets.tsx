'use client';

import dynamic from 'next/dynamic';

/**
 * Client-only wrapper that lazy-loads non-critical overlay widgets.
 *
 * Both the cart drawer and the live chat widget are invisible on first paint
 * and only show when the user interacts (cart button click, chat FAB).
 * Loading them dynamically keeps them out of the initial bundle on every route.
 *
 * This file is `'use client'` so `dynamic(..., { ssr: false })` is legal.
 * The layout is a Server Component and can't call `ssr: false` directly.
 */
const CartDrawer = dynamic(() => import('./CartDrawer'), {
 ssr: false,
 loading: () => null,
});

const LiveChatWidget = dynamic(() => import('./LiveChatWidget'), {
 ssr: false,
 loading: () => null,
});

const StickyAartiCta = dynamic(() => import('./home/StickyAartiCta'), {
 ssr: false,
 loading: () => null,
});

const HeaderScrollShadow = dynamic(() => import('./HeaderScrollShadow'), {
 ssr: false,
 loading: () => null,
});

// R-Q3-L-002 (2026-06-14): GDPR / UK DPA cookie banner.
// EU/UK consent CMP, reject-all parity per ICO. Re-prompts every 12 months.
const CookieBanner = dynamic(() => import('./CookieBanner'), {
 ssr: false,
 loading: () => null,
});

// Phase D-5 (2026-06-05): WhatsAppButton dropped — duplicate chat FAB collision.
// LiveChatWidget canonical (AI Asha + Claude API + escalate-to-ticket richer flow).
// WhatsApp still reachable via Ask Pandit nav chip + /contact + /support/ticket/new.

export function DeferredClientWidgets() {
 return (
 <>
 <CartDrawer />
 <LiveChatWidget />
 <StickyAartiCta />
 <HeaderScrollShadow />
 <CookieBanner />
 </>
 );
}
