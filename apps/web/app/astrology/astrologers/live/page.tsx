import type { Metadata } from 'next';
import LiveAstrologersClient from './LiveAstrologersClient';

/**
 * AW-03 (2026-08-12, P0) — this route did not exist.
 *
 * `GET /api/v1/astrology/astrologers/live` shipped in PR #235 and is the only
 * surface that lists genuinely onboarded astrologers (approved
 * `AstrologerProfile` rows). Nothing in the app router ever consumed it, so
 * /astrology/astrologers/live rendered the global not-found page while the
 * endpoint sat healthy behind it. The go-online toggle in the astrologer portal
 * was therefore decorative: real supply could never reach demand.
 *
 * Deliberately client-rendered below the fold of this shell: the online badge
 * comes from an in-memory presence heartbeat that decays after 15 minutes, so a
 * cached SSR snapshot would show stale availability — and availability is the
 * one claim on this page a devotee acts on immediately.
 */

export const metadata: Metadata = {
  title: 'Live Astrologers — Vedic Astrologers Online Now',
  description:
    'Talk to Vedic astrologers on Darshya. Every profile in this directory is a real, live astrologer listing with live online status, per-minute rate, languages and specializations. Book a consultation by chat or call.',
  alternates: { canonical: 'https://darshya.online/astrology/astrologers/live' },
};

export default function LiveAstrologersPage() {
  return <LiveAstrologersClient />;
}
