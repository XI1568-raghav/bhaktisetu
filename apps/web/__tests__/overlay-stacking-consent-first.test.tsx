import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import ConsentGate from '../components/ConsentGate';

// TD-07 (prod sweep 2026-08-12): at 1280x720 on /festival, /panchang,
// /calendar, /kundli and /live the visible-button enumeration returned, all
// inside the fold: "Reject all"@y627, "Manage preferences"@y627,
// "Accept all"@y627, "Need help? Chat with us"@y644, "Dismiss aarti reminder
// for this session"@y666 — a consent bar, a chat launcher and a countdown
// sharing the bottom ~95px of the very first screen.
//
// Two separate defects: the discretionary overlays did not wait for the
// consent choice, and the two right-anchored ones (chat FAB at bottom-5
// right-5, aarti card at bottom-6 right-6) were laid out on top of each other
// regardless of the banner.

const COMPONENTS = path.join(__dirname, '..', 'components');

/** Source with comments removed — a comment is not layout and not markup. */
function code(file: string): string {
  return fs
    .readFileSync(path.join(COMPONENTS, file), 'utf8')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const CONSENT_KEY = 'darshya_cookie_consent_v1';

function storeConsent() {
  window.localStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      acceptedAt: new Date().toISOString(),
      version: 1,
    }),
  );
}

describe('TD-07 — the consent choice is not crowded by other overlays', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders nothing while the cookie choice is still open', () => {
    render(
      <ConsentGate>
        <button type="button">Need help? Chat with us</button>
      </ConsentGate>,
    );
    expect(screen.queryByText(/Need help\? Chat with us/i)).toBeNull();
  });

  it('renders once a choice is already stored', () => {
    storeConsent();
    render(
      <ConsentGate>
        <button type="button">Need help? Chat with us</button>
      </ConsentGate>,
    );
    expect(screen.getByText(/Need help\? Chat with us/i)).toBeTruthy();
  });

  it('appears the moment the visitor answers the banner', () => {
    render(
      <ConsentGate>
        <button type="button">Need help? Chat with us</button>
      </ConsentGate>,
    );
    expect(screen.queryByText(/Need help\? Chat with us/i)).toBeNull();

    act(() => {
      storeConsent();
      window.dispatchEvent(new CustomEvent('darshya:consent-changed'));
    });
    expect(screen.getByText(/Need help\? Chat with us/i)).toBeTruthy();
  });

  it('the chat launcher and the aarti reminder are both behind the gate', () => {
    const src = code('DeferredClientWidgets.tsx');
    expect(src).toMatch(/ConsentGate/);
    const gated = /<ConsentGate>([\s\S]*?)<\/ConsentGate>/.exec(src)?.[1] ?? '';
    expect(gated).toMatch(/<LiveChatWidget\s*\/>/);
    expect(gated).toMatch(/<StickyAartiCta\s*\/>/);
  });

  it('the consent banner itself is NOT behind the gate', () => {
    const src = code('DeferredClientWidgets.tsx');
    const gated = /<ConsentGate>([\s\S]*?)<\/ConsentGate>/.exec(src)?.[1] ?? '';
    expect(gated).not.toMatch(/CookieBanner/);
    expect(src).toMatch(/<CookieBanner\s*\/>/);
  });

  it('the two right-hand overlays no longer occupy the same band', () => {
    const chat = code('LiveChatWidget.tsx');
    const aarti = code('home/StickyAartiCta.tsx');

    const bottomOf = (src: string) => {
      const m = /fixed[^"`']*?\bbottom-(\d+)\b/.exec(src);
      return m ? Number(m[1]) : NaN;
    };
    const chatBottom = bottomOf(chat);
    const aartiBottom = bottomOf(aarti);
    expect(Number.isNaN(chatBottom)).toBe(false);
    expect(Number.isNaN(aartiBottom)).toBe(false);

    // Tailwind spacing units are 0.25rem; the chat FAB is 56px tall, so the
    // reminder has to clear it by more than 14 units, not merely differ by one.
    expect(aartiBottom - chatBottom).toBeGreaterThanOrEqual(14);
  });
});
