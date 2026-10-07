'use client';

import dynamic from 'next/dynamic';
import ConsentGate from './ConsentGate';

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

// Perf (2026-10-07): web-push prompt. Renders nothing until a signed-in user is
// eligible, so it never needs to be in the root layout's initial bundle.
const NotificationPrompt = dynamic(
 () => import('./NotificationPrompt').then((m) => m.NotificationPrompt),
 { ssr: false, loading: () => null },
);

// R-Q3-L-002 (2026-06-14): GDPR / UK DPA cookie banner.
// EU/UK consent CMP, reject-all parity per ICO. Re-prompts every 12 months.
const CookieBanner = dynamic(() => import('./CookieBanner'), {
 ssr: false,
 loading: () => null,
});

// Phase D-5 (2026-06-05): WhatsAppButton dropped — duplicate chat FAB collision.
// LiveChatWidget canonical (AI Asha + Claude API + escalate-to-ticket richer flow).
// WhatsApp still reachable via Ask Pandit nav chip + /contact + /support/ticket/new.

// TD-07 (prod sweep 2026-08-12): the consent bar, the chat launcher and the
// aarti countdown all landed in the bottom ~95px of the first 720px screen at
// once. The banner has to be the only floating thing on screen until the
// visitor answers it — both because two more overlays crowding a consent
// control is a consent-quality problem, and because it was the bottom eighth
// of the fold spent on interruptions. The two discretionary overlays wait;
// the banner never does.
export function DeferredClientWidgets() {
 return (
 <>
 <CartDrawer />
 <ConsentGate>
 <LiveChatWidget />
 <StickyAartiCta />
 </ConsentGate>
 <HeaderScrollShadow />
 <CookieBanner />
 <NotificationPrompt />
 </>
 );
}
