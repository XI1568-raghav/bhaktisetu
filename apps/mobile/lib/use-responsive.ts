import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { spacing } from './theme';

/**
 * The four devotee tabs each captured the viewport once, at module scope:
 *
 *     const { width: SCREEN_WIDTH } = Dimensions.get('window');
 *
 * That value is read when the module is first imported and never again, so the
 * layout froze at whatever the window happened to be at launch. The
 * consequences are not hypothetical and not iOS-only:
 *
 *   · iOS — app.json declares `supportsTablet: true`, so the app runs on iPad.
 *     Rotation, Split View and Slide Over all resize the window; none of them
 *     re-ran the calculation. Apple reviews the iPad build separately, and a
 *     phone layout stretched across 1366pt is a rejection risk.
 *   · Android — the same freeze hits tablets, Fold-class devices (the window
 *     genuinely resizes on unfold) and Android 15 multi-window.
 *
 * `useWindowDimensions` (react-native, since 0.61 — present and exported in the
 * 0.76 this app pins) subscribes to the same Dimensions events and re-renders
 * the component on every one of those transitions, which is the whole fix.
 *
 * Everything width-derived is centralised here so the breakpoints exist in ONE
 * place rather than as four sets of magic numbers.
 */

/**
 * Width thresholds, in dp/pt. Deliberately aligned with the Material 3 window
 * size classes, because those are the same buckets Android uses to describe
 * foldables and multi-window and they land sensibly on Apple hardware too:
 *
 *   · < 600  — every phone in portrait, and an iPad Slide Over pane (320pt).
 *   · < 900  — phone landscape, small tablets, a foldable opened, half of an
 *              iPad in Split View.
 *   · >= 900 — full-screen tablet, both orientations.
 */
export const breakpoints = {
  compact: 600,
  expanded: 900,
} as const;

/** Outer padding of a card grid. Matches what the tabs used before. */
export const GRID_PADDING = spacing.md;
/** Gutter between grid cards, horizontally and vertically. */
export const GRID_GAP = spacing.sm;

/**
 * A card wider than this stops looking like a card. Grids grow an extra column
 * instead of inflating the tiles — see `gridColumnsFor`.
 */
const MAX_CARD_WIDTH = 340;

/** Absolute ceiling on the column bump, so the arithmetic always terminates. */
const MAX_GRID_COLUMNS = 6;

/**
 * Fraction of the viewport a horizontal-carousel card occupies, so the next
 * card peeks in at the right edge and the row reads as scrollable. This is the
 * historical phone value and is preserved exactly.
 */
const CAROUSEL_WIDTH_RATIO = 0.72;

/**
 * 0.72 of an iPad is a 737pt card. The ratio is a phone affordance, so it is
 * capped. The cap sits above 0.72 x 440 (iPhone 16 Pro Max, the widest phone
 * portrait) so no phone in portrait is affected by it.
 */
const MAX_CAROUSEL_CARD_WIDTH = 340;

/** Exact width of one card in an `columns`-wide grid `width` points across. */
export function gridCardWidth(
  width: number,
  columns: number,
  padding: number = GRID_PADDING,
  gap: number = GRID_GAP,
): number {
  const available = width - padding * 2 - gap * (columns - 1);
  return Math.max(0, available / columns);
}

/**
 * Columns for a grid at `width`.
 *
 * The breakpoints pick the base count (2 on a phone — unchanged — 3 on a
 * medium window, 4 on an expanded one). If that still leaves cards wider than
 * `MAX_CARD_WIDTH` (an external display, Samsung DeX, a 1920pt window) the
 * count is raised until they fit, rather than capping the card width and
 * leaving several hundred points of dead gutter on the right of every row.
 */
export function gridColumnsFor(
  width: number,
  padding: number = GRID_PADDING,
  gap: number = GRID_GAP,
): number {
  let columns = width < breakpoints.compact ? 2 : width < breakpoints.expanded ? 3 : 4;
  while (
    columns < MAX_GRID_COLUMNS &&
    gridCardWidth(width, columns, padding, gap) > MAX_CARD_WIDTH
  ) {
    columns += 1;
  }
  return columns;
}

/** Width of one horizontal-carousel card at `width`. */
export function carouselCardWidthFor(width: number): number {
  return Math.min(width * CAROUSEL_WIDTH_RATIO, MAX_CAROUSEL_CARD_WIDTH);
}

export interface ResponsiveGrid {
  /** Live viewport width. Updates on rotation, split-view and unfold. */
  width: number;
  columns: number;
  /** Point width of one card, exact — columns x cardWidth + gaps === width. */
  cardWidth: number;
  /**
   * MUST be spread onto any `FlatList` whose `numColumns` comes from
   * `columns`. React Native throws
   *
   *     Changing numColumns on the fly is not supported. Change the key prop
   *     on FlatList when changing the number of columns to force a fresh
   *     render of the component.
   *
   * VirtualizedList caches cell layout per column count and refuses to
   * reconcile across a change, so the list must be remounted. Passing a `key`
   * derived from the column count makes React unmount the old list and mount a
   * new one on exactly the renders where `numColumns` differs — and on no
   * others, so scroll position survives an ordinary re-render.
   */
  gridKey: string;
}

/** Live grid geometry. Re-renders the caller whenever the window resizes. */
export function useResponsiveGrid(
  padding: number = GRID_PADDING,
  gap: number = GRID_GAP,
): ResponsiveGrid {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    const columns = gridColumnsFor(width, padding, gap);
    return {
      width,
      columns,
      cardWidth: gridCardWidth(width, columns, padding, gap),
      gridKey: `grid-${columns}`,
    };
  }, [width, padding, gap]);
}

/** Live width of a horizontal-carousel card. */
export function useCarouselCardWidth(): number {
  const { width } = useWindowDimensions();
  return carouselCardWidthFor(width);
}

/**
 * Percentage width for a grid whose cards were already expressed as a
 * percentage of their container (home's puja grid). Returning 96/columns keeps
 * the historical two-column value at exactly '48%', so phones are untouched,
 * and the 4% of slack it leaves always covers the inter-card gaps at every
 * column count this returns.
 */
export function gridWidthPercent(columns: number): `${number}%` {
  return `${96 / columns}%`;
}
