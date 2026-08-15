/**
 * HN-10 (prod sweep 2026-08-12, P3) — clicking a mega-menu trigger closed the
 * panel that hovering had just opened.
 *
 * A real pointer click is always preceded by a hover, so by the time the click
 * handler ran the panel was already open and the blind `prev === key ? null`
 * toggle shut it. Measured on all five triggers: the newly-visible link count
 * went back to 0 and aria-expanded back to false. Keyboard activation was
 * unaffected, which is why it survived the a11y pass.
 *
 * The rule these tests pin: a pointer that opened a panel by hovering and then
 * clicks is confirming, not dismissing. The click promotes the hover-open to a
 * deliberate open; the NEXT click dismisses it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { CategoryNav } from '../components/CategoryNav';
import { CATEGORY_TREE } from '../lib/category-tree';

const FIRST = CATEGORY_TREE[0]!;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function trigger(label: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${label}$`) });
}

/** Let the 120ms hover-open timer fire and React flush its state update. */
function settleHover() {
  act(() => {
    vi.advanceTimersByTime(200);
  });
}

describe('HN-10 — hover-then-click keeps the panel open', () => {
  it('opens on hover after the delay', () => {
    render(<CategoryNav />);
    const btn = trigger(FIRST.label);
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    fireEvent.mouseEnter(btn);
    settleHover();

    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('a click on a panel the pointer just hovered open does NOT close it', () => {
    render(<CategoryNav />);
    const btn = trigger(FIRST.label);

    fireEvent.mouseEnter(btn);
    settleHover();
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      fireEvent.click(btn);
    });

    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('a second click then dismisses it, so the trigger is still a toggle', () => {
    render(<CategoryNav />);
    const btn = trigger(FIRST.label);

    fireEvent.mouseEnter(btn);
    settleHover();
    act(() => {
      fireEvent.click(btn);
    });
    act(() => {
      fireEvent.click(btn);
    });

    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('a click with no preceding hover still opens the panel', () => {
    render(<CategoryNav />);
    const btn = trigger(FIRST.label);

    act(() => {
      fireEvent.click(btn);
    });

    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('a click with no preceding hover still closes an already-open panel', () => {
    render(<CategoryNav />);
    const btn = trigger(FIRST.label);

    act(() => {
      fireEvent.click(btn);
    });
    act(() => {
      fireEvent.click(btn);
    });

    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('hovering a second trigger moves the open panel rather than stacking one', () => {
    const second = CATEGORY_TREE[1]!;
    render(<CategoryNav />);
    const a = trigger(FIRST.label);
    const b = trigger(second.label);

    fireEvent.mouseEnter(a);
    settleHover();
    fireEvent.mouseEnter(b);
    settleHover();

    expect(a.getAttribute('aria-expanded')).toBe('false');
    expect(b.getAttribute('aria-expanded')).toBe('true');
  });

  it('after dismissing by click, a fresh hover-then-click opens and keeps open', () => {
    render(<CategoryNav />);
    const btn = trigger(FIRST.label);

    fireEvent.mouseEnter(btn);
    settleHover();
    act(() => {
      fireEvent.click(btn);
    });
    act(() => {
      fireEvent.click(btn);
    });
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    fireEvent.mouseEnter(btn);
    settleHover();
    act(() => {
      fireEvent.click(btn);
    });

    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });
});
