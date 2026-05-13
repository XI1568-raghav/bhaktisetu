'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CATEGORY_TREE, type CategoryKey } from '../lib/category-tree';
import { CategoryMegaMenu } from './CategoryMegaMenu';

const HOVER_OPEN_DELAY_MS = 120;
const HOVER_CLOSE_DELAY_MS = 120;

/**
 * Desktop-only 5-category mega-menu nav. Hidden < md.
 *
 * Open behavior:
 *  - hovering a trigger opens its panel after 120ms
 *  - leaving the trigger AND panel closes it after 120ms (allows mouse travel)
 *  - focusing a trigger via keyboard opens it immediately
 *  - clicking a trigger toggles it
 *  - Escape closes any open panel and returns focus to its trigger
 *  - clicking outside closes
 *
 * Mobile gets MobileNavV2 instead — render this only inside an `md:` block.
 */
export function CategoryNav() {
  const [openKey, setOpenKey] = useState<CategoryKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Map<CategoryKey, HTMLButtonElement | null>>(
    new Map(),
  );
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        setOpenKey(key);
      }, HOVER_OPEN_DELAY_MS);
    },
    [clearTimers],
  );

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setOpenKey(null);
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearTimers]);

  const closeNow = useCallback(() => {
    clearTimers();
    setOpenKey(null);
  }, [clearTimers]);

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
        clearTimers();
        setOpenKey(key);
      }
    },
    [clearTimers],
  );

  const openCategory = openKey
    ? CATEGORY_TREE.find((c) => c.key === openKey)
    : null;

  return (
    <div
      ref={containerRef}
      className="hidden md:flex items-center gap-1 mx-auto relative"
      onMouseLeave={scheduleClose}
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
            onFocus={() => {
              clearTimers();
              setOpenKey(category.key);
            }}
            onClick={() => {
              clearTimers();
              setOpenKey((prev) => (prev === category.key ? null : category.key));
            }}
            onKeyDown={(e) => onTriggerKeyDown(e, category.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              isOpen
                ? 'text-surface-900 bg-surface-100'
                : 'text-surface-500 hover:text-surface-800 hover:bg-surface-100'
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
          id={`${baseId}-panel-${openCategory.key}`}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50"
          onMouseEnter={clearTimers}
          onMouseLeave={scheduleClose}
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
