'use client';

import { useEffect } from 'react';

// Per docs/marketing/100-signups-5-channels-playbook.md (R-Q1-M-012):
// capture per-channel attribution at first touch so signup analytics
// can segment by Reddit / Twitter / WhatsApp / Telegram / Instagram.
//
// Sources read (precedence: utm_source > ref-channel-prefix):
//   ?utm_source=reddit | twitter | whatsapp | telegram | instagram | other
//   ?ref=reddit_<slug> | tw_<date> | wa_<group> | tg_<channel> | ig_<post>
//   ?utm_medium / ?utm_campaign / ?utm_content / ?utm_term — passed through
//
// Stored as a PostHog super property `signup_channel` (+ raw utm_* fields)
// via posthog.register so every future event carries the attribution.
// Also persisted to localStorage so a later signup from a separate tab can
// still attribute back to the original touch.

const STORAGE_KEY = 'darshya_attr';
const REF_PREFIX_MAP: Record<string, string> = {
  reddit: 'reddit',
  tw: 'twitter',
  twitter: 'twitter',
  x: 'twitter',
  wa: 'whatsapp',
  whatsapp: 'whatsapp',
  tg: 'telegram',
  telegram: 'telegram',
  ig: 'instagram',
  instagram: 'instagram',
};

type Attribution = {
  signup_channel?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
  first_touch_at?: string;
};

function readStored(): Attribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

function writeStored(attr: Attribution): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attr));
  } catch {
    /* ignore quota */
  }
}

function deriveChannelFromRef(ref: string | null): string | null {
  if (!ref) return null;
  const lower = ref.toLowerCase();
  const prefix = lower.split('_')[0];
  if (!prefix) return null;
  return REF_PREFIX_MAP[prefix] ?? null;
}

function normalizeUtmSource(src: string | null): string | null {
  if (!src) return null;
  const lower = src.toLowerCase();
  return REF_PREFIX_MAP[lower] ?? lower;
}

function pickString(value: string | null, maxLen: number): string | undefined {
  if (!value) return undefined;
  const trimmed = value.slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

export function ChannelAttribution(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const refRaw = params.get('ref');

    const channel = normalizeUtmSource(utmSource) ?? deriveChannelFromRef(refRaw);
    const hasAttrParam = Boolean(utmSource ?? refRaw ?? params.get('utm_campaign'));

    if (!hasAttrParam) {
      // No new attribution on this URL — re-register stored attribution
      // with PostHog (in case the snippet just loaded) and exit.
      const stored = readStored();
      if (stored && typeof window.posthog !== 'undefined' && window.posthog) {
        window.posthog.register(stored as Record<string, unknown>);
      }
      return;
    }

    // First-touch wins. Don't clobber an earlier stored attribution unless
    // none was captured before.
    const existing = readStored();
    if (existing?.signup_channel) {
      // Already attributed — still register so PostHog has it after a
      // fresh page load.
      if (typeof window.posthog !== 'undefined' && window.posthog) {
        window.posthog.register(existing as Record<string, unknown>);
      }
      return;
    }

    const attr: Attribution = {
      first_touch_at: new Date().toISOString(),
    };
    if (channel) attr.signup_channel = channel;
    const utmSrc = pickString(utmSource, 64);
    if (utmSrc) attr.utm_source = utmSrc;
    const utmMedium = pickString(params.get('utm_medium'), 64);
    if (utmMedium) attr.utm_medium = utmMedium;
    const utmCampaign = pickString(params.get('utm_campaign'), 128);
    if (utmCampaign) attr.utm_campaign = utmCampaign;
    const utmContent = pickString(params.get('utm_content'), 128);
    if (utmContent) attr.utm_content = utmContent;
    const utmTerm = pickString(params.get('utm_term'), 128);
    if (utmTerm) attr.utm_term = utmTerm;
    const refClean = pickString(refRaw, 64);
    if (refClean) attr.ref = refClean;

    writeStored(attr);

    if (typeof window.posthog !== 'undefined' && window.posthog) {
      window.posthog.register(attr as Record<string, unknown>);
      window.posthog.capture('attribution_captured', attr as Record<string, unknown>);
    }
  }, []);

  return null;
}
