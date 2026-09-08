'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CATEGORY_TREE, type CategoryKey } from '../lib/category-tree';
import { CategoryMegaMenu } from './CategoryMegaMenu';

const HOVER_OPEN_DELAY_MS = 120;
const HOVER_CLOSE_DELAY_MS = 120;

/**
 * Focusable descendants of an open panel, in DOM order. Match on focusability
 * rather than on the menuitem role.
 *
 * HOME-IA (2026-09-04): the Library panel now DOES carry role="menuitem", like
 * the other four — the note that used to sit here said it rendered plain links,
 * which was the reason this selector was written this way and is no longer
 * true. Keeping the focusability match anyway: it is the weaker precondition,
 * so it survives a panel choosing either contract, and the alternative would
 * silently strand a future panel's keyboard entry the way it once stranded
 * Library's (A11Y-03, WCAG 2.1.1 Level A).
 */
const PANEL_ITEM_SELECTOR = 'a[href], button:not([disabled])';

/**
 * Desktop-only 5-category mega-menu nav. Hidden < md.
 *
 * Open behavior:
 *  - hovering a trigger opens its panel after 120ms
 *  - leaving the trigger AND panel closes it after 120ms (allows mouse travel)
 *  - clicking a trigger toggles it
 *  - Enter/Space/ArrowDown opens a panel and moves focus to its first item;
 *    ArrowUp opens and moves focus to the last item
 *  - ArrowUp/ArrowDown/Home/End rove between items inside an open panel
 *  - Escape closes any open panel and returns focus to its trigger
 *  - clicking outside, or tabbing out of the nav entirely, closes
 *
 * Focus deliberately does NOT open a panel. A single shared panel is rendered
 * after all five triggers, so when every trigger opened its own panel on focus
 * a forward Tab across the nav kept swapping the panel and only the LAST
 * trigger's items were ever reachable (A11Y-03, WCAG 2.1.1 Level A).
 *
 * Mobile gets MobileNavV2 instead — render this only inside an `md:` block.
 */
export function CategoryNav() {
  const [openKey, setOpenKey] = useState<CategoryKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Map<CategoryKey, HTMLButtonElement | null>>(
    new Map(),
  );
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Where focus should land once a keyboard-opened panel has rendered.
  const focusIntentRef = useRef<'first' | 'last' | null>(null);
  /**
   * HN-10. The key whose panel was opened by the pointer resting on it, and
   * which the pointer has not yet confirmed with a click. A real click is
   * always preceded by a hover, so without this the click handler saw a panel
   * that was already open and shut it — the menu flashed open and vanished.
   * The first click after a hover-open confirms (and clears this), the next
   * one dismisses.
   */
  const hoverOpenedRef = useRef<CategoryKey | null>(null);
  const baseId = useId();

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(
    (key: CategoryKey) => {
      clearTimers();
      openTimerRef.current = setTimeout(() => {
        hoverOpenedRef.current = key;
        setOpenKey(key);
      }, HOVER_OPEN_DELAY_MS);
    },
    [clearTimers],
  );

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      hoverOpenedRef.current = null;
      setOpenKey(null);
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearTimers]);

  const closeNow = useCallback(() => {
    clearTimers();
    hoverOpenedRef.current = null;
    setOpenKey(null);
  }, [clearTimers]);

  const panelItems = useCallback((): HTMLElement[] => {
    const root = panelRef.current;
    return root
      ? Array.from(root.querySelectorAll<HTMLElement>(PANEL_ITEM_SELECTOR))
      : [];
  }, []);

  const focusPanelItem = useCallback(
    (which: 'first' | 'last') => {
      const items = panelItems();
      if (!items.length) return;
      // Guarded by the length check above; noUncheckedIndexedAccess still
      // widens an index read to `| undefined`.
      (which === 'last' ? items[items.length - 1] : items[0])?.focus();
    },
    [panelItems],
  );

  // Move focus into the panel once a keyboard open has rendered it.
  useEffect(() => {
    const intent = focusIntentRef.current;
    focusIntentRef.current = null;
    if (!openKey || !intent) return;
    focusPanelItem(intent);
  }, [openKey, focusPanelItem]);

  const openAndFocus = useCallback(
    (key: CategoryKey, which: 'first' | 'last') => {
      clearTimers();
      if (openKey === key) {
        // Already open: no state change would fire, so move focus directly.
        focusPanelItem(which);
        return;
      }
      focusIntentRef.current = which;
      setOpenKey(key);
    },
    [clearTimers, focusPanelItem, openKey],
  );

  // Close on Escape and outside click
  useEffect(() => {
    if (!openKey) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const trigger = triggerRefs.current.get(openKey);
        closeNow();
        trigger?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeNow();
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [openKey, closeNow]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const onTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, key: CategoryKey) => {
      const idx = CATEGORY_TREE.findIndex((c) => c.key === key);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = CATEGORY_TREE[(idx + 1) % CATEGORY_TREE.length];
        if (next) triggerRefs.current.get(next.key)?.focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev =
          CATEGORY_TREE[(idx - 1 + CATEGORY_TREE.length) % CATEGORY_TREE.length];
        if (prev) triggerRefs.current.get(prev.key)?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAndFocus(key, 'first');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        openAndFocus(key, 'last');
      }
    },
    [openAndFocus],
  );

  // Roving focus between items inside the open panel.
  const onPanelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const items = panelItems();
      if (!items.length) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[current < 0 ? 0 : (current + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[
          current < 0
            ? items.length - 1
            : (current - 1 + items.length) % items.length
        ]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    },
    [panelItems],
  );

  // Tabbing out of the nav entirely closes the panel. relatedTarget is null for
  // synthetic/unknown blurs — leave the panel alone in that case.
  const onContainerBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const next = e.relatedTarget as Node | null;
      if (!next) return;
      if (containerRef.current && !containerRef.current.contains(next)) {
        closeNow();
      }
    },
    [closeNow],
  );

  const openCategory = openKey
    ? CATEGORY_TREE.find((c) => c.key === openKey)
    : null;

  return (
    <div
      ref={containerRef}
      // `mx-auto` REMOVED. Its parent in app/layout.tsx is `flex-1 min-w-0`, so
      // this group is free to shrink below its content width — measured at
      // 1280px it was allotted 275px for five buttons needing ~450px. An auto
      // margin on an overflowing flex item centres the OVERFLOW, which pushed
      // ~85px out of each side: "Worship" painted over the "Darshya" wordmark
      // at x=104 (the brand occupies 88-177) and "Shop" painted under
      // "Ask Pandit" at x=476. Centring is the parent's job — it already sets
      // `justify-center` — and doing it here as well is what made an overflow
      // spill symmetrically instead of clipping.
      className="hidden md:flex items-center gap-1 relative min-w-0"
      onMouseLeave={scheduleClose}
      onBlur={onContainerBlur}
    >
      {CATEGORY_TREE.map((category) => {
        const isOpen = openKey === category.key;
        const triggerId = `${baseId}-trigger-${category.key}`;
        const panelId = `${baseId}-panel-${category.key}`;
        return (
          <button
            key={category.key}
            id={triggerId}
            ref={(el) => {
              triggerRefs.current.set(category.key, el);
            }}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            onMouseEnter={() => scheduleOpen(category.key)}
            onClick={() => {
              clearTimers();
              const confirmingHover = hoverOpenedRef.current === category.key;
              hoverOpenedRef.current = null;
              if (confirmingHover) return;
              setOpenKey((prev) => (prev === category.key ? null : category.key));
            }}
            onKeyDown={(e) => onTriggerKeyDown(e, category.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${
              isOpen
                ? 'text-surface-900 bg-surface-100'
                : 'text-surface-700 hover:text-surface-900 hover:bg-surface-100'
            }`}
          >
            {category.label}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        );
      })}

      {openCategory && (
        <div
          ref={panelRef}
          id={`${baseId}-panel-${openCategory.key}`}
          // HOME-IA (2026-09-04): one width for all five panels. Library used to
          // take a 1120px branch of its own because it painted 41 subGroup links
          // in four columns — measured live at 1120x655, two thirds of a 900px
          // viewport, covering the hero it exists to navigate away from.
          // LibraryMegaPanel now renders the same 2-column item shape as every
          // other category (12 links, not 46), so the special case has nothing
          // left to justify it. The max-height stays as a safety net; at this
          // link count the content no longer reaches it.
          className="fixed top-16 left-1/2 -translate-x-1/2 w-[min(640px,calc(100vw-48px))] max-h-[min(720px,calc(100vh-120px))] overflow-y-auto z-50"
          onMouseEnter={clearTimers}
          onMouseLeave={scheduleClose}
          onKeyDown={onPanelKeyDown}
        >
          <CategoryMegaMenu
            category={openCategory}
            onItemClick={closeNow}
            labelledBy={`${baseId}-trigger-${openCategory.key}`}
          />
        </div>
      )}
    </div>
  );
}

export default CategoryNav;
