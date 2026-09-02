import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useContent } from '@poojly/api-client';
import type { ContentFilterParams } from '@poojly/shared';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { contentTypeLabel } from '../../lib/enum-labels';

/**
 * NAV-01, 2026-09-02 — THE FABRICATED CATALOGUE IS GONE.
 *
 * WHAT WAS HERE
 * -------------
 * A ten-row literal array named `contentData` — "Om Jai Jagdish Hare · Lord
 * Vishnu · 5:42", "Gayatri Mantra (108 times) · Goddess Gayatri · 32:00", and
 * eight more — invented deity attributions and invented running times for
 * devotional works, presented as this product's library. It reached the screen
 * two ways, and the second was worse than the first:
 *
 *   1. `: contentData` — the whole array rendered verbatim whenever the API
 *      returned nothing, so an empty library and a broken request both looked
 *      like ten pieces of real inventory.
 *
 *   2. `const fb = contentData[i % contentData.length]!` — for REAL rows, the
 *      mock was indexed by position modulo ten and painted over the response:
 *
 *          deity:    (c as any).deity    ?? fb.deity
 *          duration: (c as any).duration ?? fb.duration
 *
 *      `duration` is not a field this API has ever sent (the column is
 *      `durationSeconds`), so that `??` fell through on EVERY row, every time:
 *      each real aarti was stamped with whatever running time happened to sit
 *      at its index in the mock. A devotee reading "9:30" under a real title
 *      was reading a number attached to a different work entirely.
 *
 * `inferContentType(category, title)` went the same way. It guessed the type
 * from a `category` field that does not exist and from substrings of the
 * title, and `return 'aarti'` was its default — which is the mechanical cause
 * of the "12+ invented aartis" the audit counted. The server sends `type`, a
 * ContentType enum, on every row.
 *
 * WHAT THE SERVER ACTUALLY SENDS
 * ------------------------------
 * apps/api/src/services/content.service.ts `findAll` selects exactly:
 *
 *   id, type, title, titleLocal, slug, body, deity, language, durationSeconds,
 *   tags, isPremium, viewCount, likeCount, imageUrl, audioUrl, videoUrl,
 *   status, publishedAt
 *
 * inside `{ data: [...], pagination: {...} }` (routes/content.ts:6 returns the
 * service result unchanged). Note what is NOT in that list: `duration`,
 * `mediaUrl`, `thumbnailUrl`, `description`, `isFeatured` — all four are
 * declared on `ContentItem` in packages/shared/src/types/index.ts:333 and none
 * of them is ever populated. The declared type is the same envelope fiction
 * PAR-07 documents for pujas, so this screen does not trust it: the payload
 * goes through a selector pinned field-for-field to the service's `select:`
 * block, and an unrecognised shape yields an EMPTY list rather than invented
 * rows.
 *
 * THE RULE, RESTATED
 * ------------------
 * An absent field removes its row. `deity` is nullable in the schema, so the
 * deity line is rendered only when the server sends one. `durationSeconds` is
 * nullable, so the duration is rendered only when there is one to render, and
 * it is FORMATTED from the server's seconds — never typed out as a plausible
 * "5:42".
 *
 * THE TABS NOW FILTER SERVER-SIDE
 * -------------------------------
 * `useContent({ type })`. GET /api/v1/content accepts `type` and the handler
 * passes it to a Prisma `where`. The old code fetched one unfiltered page of
 * 20 and partitioned it in JS across four tabs — so with eight ContentType
 * values in the enum a tab could be empty purely because page 1 happened not
 * to contain that type, and "No bhajan content yet" was then a claim about
 * pagination dressed up as a claim about the library.
 *
 * THERE IS NO AUDIO PLAYER, SO THERE IS NO PLAY BUTTON
 * ----------------------------------------------------
 * The screen shipped a play glyph on every row and a bottom mini-player with a
 * progress bar. None of it could play anything: apps/mobile/package.json has
 * no audio dependency at all — not expo-av, not react-native-track-player;
 * `expo-video` is the darshan player's, and it is video. `onPress` set a
 * `playingId` in React state, the glyph flipped to a pause icon, and a
 * fixed-width bar was drawn under a track that had never started. That is a
 * fabricated PLAYBACK STATE, which is the same defect class as the fabricated
 * rows and is removed with them rather than left to apologise.
 *
 * What replaces it is the thing the API already sends and the screen never
 * showed: `body`, the actual text of the aarti, chalisa, mantra or bhajan.
 * Tapping a row opens it inline. A row whose `body` the server did not send is
 * not tappable and says so — it is not a disabled button, it is simply not a
 * button.
 */

type ContentType = 'aarti' | 'chalisa' | 'mantra' | 'bhajan';

interface ContentRow {
  id: string;
  slug: string;
  title: string;
  /** Devanagari/regional title. Rendered only when the server sends one. */
  titleLocal: string | null;
  type: ContentType;
  /** Nullable in the schema. No deity line when absent — never a guess. */
  deity: string | null;
  /** Formatted from `durationSeconds`. Null when the server sent no duration. */
  durationLabel: string | null;
  isPremium: boolean;
  /** The work itself. Null when the row carries no text to open. */
  body: string | null;
}

const tabs: { key: ContentType; label: string }[] = [
  { key: 'aarti', label: 'Aarti' },
  { key: 'chalisa', label: 'Chalisa' },
  { key: 'mantra', label: 'Mantra' },
  { key: 'bhajan', label: 'Bhajan' },
];

const TAB_KEYS: ReadonlySet<string> = new Set(tabs.map((t) => t.key));

// ─── selectors ──────────────────────────────────────────────────────────────
//
// Local rather than in lib/api-contracts.ts for the same reason
// puja-detail.tsx keeps `selectPujaProse` local: only this screen reads the
// descriptive columns, and the booking-critical selectors in that module are
// shared by screens that must not disagree. Pure functions, no react-native
// import, so they parse under the plain-node vitest config.

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

/** Rows off `{ data: [...] }`. Anything else is an empty page, not a default. */
function dataRows(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];
  const rows = payload.data;
  return Array.isArray(rows) ? rows.filter(isRecord) : [];
}

/**
 * `durationSeconds` -> "5:42" / "1:02:15".
 *
 * Returns null for anything that is not a positive finite number, so a missing
 * or zero duration removes the line instead of printing "0:00" — which reads
 * as a real, and wrong, running time.
 */
function formatDuration(v: unknown): string | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null;
  const total = Math.round(v);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * The response -> rows this screen can honestly render.
 *
 * A row without an id, a slug or a title has nothing to key, address or label,
 * so it is dropped rather than filled in. A `type` outside the four tabs is
 * also dropped: the enum has eight values (story, article, shloka, video_reel
 * are the others) and coercing one of those into "Aarti" is exactly the
 * mislabelling this rewrite exists to end.
 */
function selectContentRows(payload: unknown): ContentRow[] {
  return dataRows(payload)
    .map((c): ContentRow | null => {
      const id = str(c.id);
      const slug = str(c.slug);
      const title = str(c.title);
      const type = str(c.type);
      if (!id || !slug || !title || !type || !TAB_KEYS.has(type)) return null;
      return {
        id,
        slug,
        title,
        titleLocal: str(c.titleLocal),
        type: type as ContentType,
        deity: str(c.deity),
        durationLabel: formatDuration(c.durationSeconds),
        isPremium: c.isPremium === true,
        body: str(c.body),
      };
    })
    .filter((r): r is ContentRow => r !== null);
}

const typeColors: Record<ContentType, string> = {
  aarti: colors.saffron[600],
  chalisa: colors.amber[500],
  mantra: colors.green[600],
  bhajan: colors.stone[600],
};

const typeIcons: Record<ContentType, React.ComponentProps<typeof Ionicons>['name']> = {
  aarti: 'flame',
  chalisa: 'book',
  mantra: 'pulse',
  bhajan: 'musical-notes',
};

const ContentItemRow = React.memo(function ContentItemRow({
  item,
  isOpen,
  onToggle,
}: {
  item: ContentRow;
  isOpen: boolean;
  onToggle: (id: string) => void;
}) {
  // A row with no text to open is not a button. Rendering it as a disabled
  // TouchableOpacity would still announce "button, dimmed" to VoiceOver and
  // still invite the tap; a View announces what it is.
  const Row: React.ComponentType<any> = item.body ? TouchableOpacity : View;
  const interactive = item.body
    ? {
        activeOpacity: 0.7,
        onPress: () => onToggle(item.id),
        accessibilityRole: 'button' as const,
        accessibilityState: { expanded: isOpen },
        accessibilityLabel: item.title,
        accessibilityHint: isOpen ? 'Collapses the text' : 'Shows the full text',
      }
    : {};

  return (
    <View style={[styles.contentCard, isOpen && styles.contentCardActive]}>
      <Row style={styles.contentRow} {...interactive}>
        <View style={styles.contentIcon}>
          <Ionicons name={typeIcons[item.type]} size={18} color={typeColors[item.type]} />
        </View>

        <View style={styles.contentInfo}>
          <Text style={styles.contentTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {/* Rendered only when the server sent one. */}
          {item.titleLocal ? (
            <Text style={styles.contentTitleLocal} numberOfLines={1}>
              {item.titleLocal}
            </Text>
          ) : null}
          <View style={styles.contentMeta}>
            <View
              style={[styles.typeBadge, { backgroundColor: `${typeColors[item.type]}18` }]}
            >
              <Text style={[styles.typeBadgeText, { color: typeColors[item.type] }]}>
                {contentTypeLabel(item.type)}
              </Text>
            </View>
            {item.deity ? <Text style={styles.contentDeity}>{item.deity}</Text> : null}
            {item.durationLabel ? (
              <Text style={styles.contentDuration}>{item.durationLabel}</Text>
            ) : null}
            {item.isPremium ? (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond-outline" size={10} color={colors.saffron[700]} />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            ) : null}
          </View>
        </View>

        {item.body ? (
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.stone[400]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : null}
      </Row>

      {isOpen && item.body ? (
        <View style={styles.bodyBlock}>
          <Text style={styles.bodyText} selectable>
            {item.body}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export default function ContentScreen() {
  const [activeTab, setActiveTab] = useState<ContentType>('aarti');
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Server-side filter. The tab IS the query, so an empty tab means the
   * library has none of that type — not that page 1 happened to miss it.
   *
   * THE CAST, AND WHY IT IS NOT LAZINESS
   * ------------------------------------
   * `ContentFilterParams.type` is declared as the SHARED `ContentType`
   * (packages/shared/src/types/index.ts:18) — an UPPERCASE enum, ARTICLE |
   * VIDEO | AUDIO | MANTRA | AARTI | CHALISA | STORY, with no `bhajan` in it
   * at all. The wire does not agree with that declaration. The handler casts
   * the raw query string straight to the PRISMA enum
   * (content.service.ts:34), whose values are lowercase and are
   * aarti | chalisa | mantra | bhajan | story | article | shloka |
   * video_reel.
   *
   * This is not a style difference, it is a live 500. Verified against
   * production on 2026-09-02:
   *
   *   GET /api/v1/content?type=aarti  -> 200, 5 rows
   *   GET /api/v1/content?type=AARTI  -> 500
   *
   * So the lowercase literal is the correct value and the declared type is
   * the thing that is wrong — the same class of divergence PAR-07 documents
   * for pujas. Correcting packages/shared touches every consumer of that
   * enum and is not this screen's change to make; the cast is the narrowest
   * possible way to say "the server's spelling wins", confined to one line
   * with the evidence written beside it.
   */
  const contentQuery = useContent({
    type: activeTab as unknown as ContentFilterParams['type'],
  });

  // Stable toggle so renderItem stays referentially equal across re-renders
  // (paired with React.memo on ContentItemRow → only the row whose isOpen
  // changed re-renders).
  const handleToggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const items = useMemo(() => selectContentRows(contentQuery.data), [contentQuery.data]);

  const errorText = contentQuery.isError
    ? contentQuery.error instanceof Error
      ? contentQuery.error.message
      : 'Unknown error'
    : null;

  const selectTab = useCallback((key: ContentType) => {
    setActiveTab(key);
    // The open row belongs to the tab that is leaving; carrying its id across
    // would silently re-expand an unrelated row if the ids ever collided.
    setOpenId(null);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await contentQuery.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spiritual Content</Text>
        <Text style={styles.headerSubtitle}>
          Aartis, chalisas, mantras and bhajans
        </Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentControl}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.segmentTab,
                  isActive && styles.segmentTabActive,
                ]}
                onPress={() => selectTab(tab.key)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
              >
                <Ionicons
                  name={typeIcons[tab.key]}
                  size={14}
                  color={isActive ? colors.white : colors.stone[500]}
                />
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={useCallback(
          ({ item }: { item: ContentRow }) => (
            <ContentItemRow item={item} isOpen={openId === item.id} onToggle={handleToggle} />
          ),
          [openId, handleToggle]
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          /* Three distinct states, because they are three distinct facts and
             the devotee can act on only one of them. The old screen had no
             loading state and no error state at all — it substituted the mock
             array for both. */
          contentQuery.isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={colors.saffron[600]} />
              <Text style={styles.emptyText}>Loading…</Text>
            </View>
          ) : errorText ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.stone[300]} />
              <Text style={styles.emptyText}>Could not load this library</Text>
              <Text style={styles.emptySubtext}>{errorText} — pull down to retry.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name={typeIcons[activeTab]} size={48} color={colors.stone[300]} />
              <Text style={styles.emptyText}>
                No {contentTypeLabel(activeTab).toLowerCase()} published yet
              </Text>
              <Text style={styles.emptySubtext}>Pull down to check again.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.stone[900],
  },
  headerSubtitle: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    marginTop: 2,
  },
  // Segmented Control
  segmentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: colors.stone[100],
    borderRadius: borderRadius.md,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  segmentTabActive: {
    backgroundColor: colors.saffron[600],
    shadowColor: colors.saffron[700],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[500],
  },
  segmentTextActive: {
    color: colors.white,
  },
  // List
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  // Content Row
  contentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    overflow: 'hidden',
  },
  contentCardActive: {
    borderColor: colors.saffron[200],
    backgroundColor: colors.saffron[50],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // 44 icon + 2x8 padding clears the 44pt minimum on the tappable row.
    padding: spacing.sm,
    gap: spacing.sm,
  },
  contentIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.stone[100],
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[900],
  },
  contentTitleLocal: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginTop: 1,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  contentDeity: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
  },
  contentDuration: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    fontWeight: '500',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.saffron[100],
  },
  premiumBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.saffron[700],
  },
  // The work itself, opened in place.
  bodyBlock: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  bodyText: {
    fontSize: fontSize.base,
    lineHeight: 26,
    color: colors.stone[800],
  },
  // Empty / loading / error state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.stone[500],
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.stone[400],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
