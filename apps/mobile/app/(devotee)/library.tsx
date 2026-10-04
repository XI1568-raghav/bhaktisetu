import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { openWebHandoff, describeWebHandoff } from '../../lib/in-app-web';
import { WEBVIEW_AVAILABLE } from '../../lib/webview-module';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The long tail of devotional writing — reached, not copied.
 *
 * THE PROBLEM THIS SOLVES, AND THE ONE IT REFUSES TO SOLVE THE OTHER WAY
 * ---------------------------------------------------------------------
 * darshya.online carries ~130 devotional content routes across 32 families:
 * deity/[slug], chalisa/[slug], shlokas/[slug], vedas, puranas, upanishads,
 * ramayana/[kanda], mahabharata/[parva], gita/[chapter], nakshatra, tithi,
 * vrat, ekadashi, jyotirlinga, shakti-peeth, sacred-rivers, dashavatar and
 * more. Every one of them reads a hardcoded TypeScript array in apps/web/lib:
 * aartis.ts is 3,201 lines, tirthas.ts 2,327, vrats.ts 2,192, chalisas.ts
 * 2,058 — 23,253 lines across 34 modules, with NO API in front of any of it.
 * The API has no route for a single one of these families; `apps/web/lib` is
 * outside its tsconfig rootDir, so it cannot even import them.
 *
 * That leaves two ways to put this material in the app.
 *
 *   1. COPY THE ARRAYS INTO THE BUNDLE. Rejected. Twenty-three thousand lines
 *      of devotional text with no shared source begins drifting from the web
 *      copy the day it lands, and every correction after that has to be made
 *      twice by someone who remembers both. This repo has already run the
 *      experiment: wedding prices duplicated the same way ended up differing
 *      FIVE-FOLD between web and mobile. A wrong price is embarrassing. A
 *      chalisa whose verses have quietly diverged from the corrected web copy
 *      is worse, and nothing in the app would surface it.
 *
 *   2. OPEN THE REAL PAGE. This screen. Each row hands off to the page that
 *      already exists, through the same origin-guarded in-app browser the
 *      astrology tools use. Nothing is copied, so nothing can drift; a
 *      correction published to the website is live in the app immediately,
 *      with no release.
 *
 * WHY ONLY INDEX ROUTES ARE LISTED
 * --------------------------------
 * Every entry below is a top-level index (`/chalisa`, `/vedas`), never a slug
 * (`/chalisa/hanuman-chalisa`). A list of ~130 slugs in this bundle would be a
 * second thing to keep in sync — the exact failure this screen exists to
 * avoid — and would 404 inside the frame the moment one was renamed. The index
 * pages already list their own contents, so browsing continues inside the
 * frame using the website's own navigation, which is always current.
 *
 * All 32 URLs below were verified 200 against production on 2026-09-08.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not a claim that these families are native app surfaces. They are
 * organic-search pages, and the honest treatment is to make them reachable
 * cheaply rather than to reimplement 130 screens or to fake them. Where the
 * API genuinely serves the material, the app renders it natively instead and
 * this screen does not duplicate that: the knowledge hub's 120 MDX articles,
 * the ContentItem library on content.tsx, and the panchang festivals and vrats
 * on festivals.tsx are all native and are deliberately absent from the list
 * below.
 *
 * Every row says where it goes. `describeWebHandoff` derives the role, hint
 * and glyph from the same decision that routes the tap, so a build without the
 * WebView announces "opens in your browser" and one with it announces "opens
 * in the app" — neither can be wrong about itself.
 */

interface LibraryEntry {
  /** Path on the website, no leading origin. Verified to 200. */
  path: string;
  label: string;
  /** What the page is. Descriptive, never a count or a claim about contents. */
  blurb: string;
}

interface LibrarySection {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  entries: LibraryEntry[];
}

const SECTIONS: LibrarySection[] = [
  {
    title: 'Scriptures',
    icon: 'book',
    tint: colors.amber[600],
    entries: [
      { path: 'vedas', label: 'Vedas', blurb: 'The four Vedas and their structure' },
      { path: 'upanishads', label: 'Upanishads', blurb: 'The principal Upanishads' },
      { path: 'puranas', label: 'Puranas', blurb: 'The Mahapuranas and their themes' },
      { path: 'gita', label: 'Bhagavad Gita', blurb: 'Chapter by chapter' },
      { path: 'ramayana', label: 'Ramayana', blurb: 'The kandas of Valmiki’s epic' },
      { path: 'mahabharata', label: 'Mahabharata', blurb: 'The parvas of the epic' },
      { path: 'yoga-sutras', label: 'Yoga Sutras', blurb: 'Patanjali, pada by pada' },
    ],
  },
  {
    title: 'Devotion',
    icon: 'flame',
    tint: colors.saffron[600],
    entries: [
      { path: 'deity', label: 'Deities', blurb: 'Iconography, stories and worship' },
      { path: 'aarti', label: 'Aartis', blurb: 'Aarti texts and their occasions' },
      { path: 'chalisa', label: 'Chalisas', blurb: 'Forty-verse devotional hymns' },
      { path: 'shlokas', label: 'Shlokas', blurb: 'Verses with meaning and context' },
      { path: 'chants', label: 'Chants', blurb: 'Mantras and their traditions' },
      { path: 'dashavatar', label: 'Dashavatar', blurb: 'The ten avatars of Vishnu' },
      { path: 'bhakti-saint', label: 'Bhakti Saints', blurb: 'The saints of the bhakti movement' },
    ],
  },
  {
    title: 'Calendar and panchang',
    icon: 'calendar',
    tint: colors.green[600],
    entries: [
      { path: 'festival', label: 'Festivals', blurb: 'Observances through the year' },
      { path: 'vrat', label: 'Vrats', blurb: 'Fasts and how they are kept' },
      { path: 'ekadashi', label: 'Ekadashi', blurb: 'The Ekadashi cycle' },
      { path: 'tithi', label: 'Tithis', blurb: 'The lunar days' },
      { path: 'nakshatra', label: 'Nakshatras', blurb: 'The twenty-seven lunar mansions' },
      { path: 'masa', label: 'Vedic Months', blurb: 'The lunar months' },
      { path: 'muhurat', label: 'Muhurats', blurb: 'Auspicious timings' },
    ],
  },
  {
    title: 'Pilgrimage',
    icon: 'location',
    tint: colors.saffron[700],
    entries: [
      { path: 'jyotirlinga', label: 'Jyotirlingas', blurb: 'The twelve Jyotirlingas' },
      { path: 'shakti-peeth', label: 'Shakti Peeths', blurb: 'The Shakti Peeth sites' },
      { path: 'sacred-rivers', label: 'Sacred Rivers', blurb: 'Rivers held sacred and why' },
      { path: 'tirth', label: 'Tirthas', blurb: 'Pilgrimage places across India' },
    ],
  },
  {
    title: 'Philosophy and symbols',
    icon: 'infinite',
    tint: colors.stone[600],
    entries: [
      { path: 'darshanas', label: 'Darshanas', blurb: 'The six schools of philosophy' },
      { path: 'chakras', label: 'Chakras', blurb: 'The subtle-body centres' },
      { path: 'hindu-symbols', label: 'Symbols', blurb: 'Symbols and their meanings' },
      { path: 'nava-graha', label: 'Nava Graha', blurb: 'The nine planetary deities' },
      { path: 'sapta-rishis', label: 'Sapta Rishis', blurb: 'The seven seers' },
      { path: 'navaratna', label: 'Navaratna', blurb: 'The nine gemstones' },
      { path: 'vedic-yajnas', label: 'Vedic Yajnas', blurb: 'Fire rituals and their purpose' },
    ],
  },
];

const WEB = webOrigin();

export default function LibraryScreen() {
  const host = hostOf(WEB.origin);
  // One options object for every row, so no two controls in this screen can
  // disagree about whether this build can frame the website.
  const handoffOpts = { webViewAvailable: WEBVIEW_AVAILABLE, origin: WEB.origin };
  const io = { push: (r: unknown) => router.push(r as never), openExternal: Linking.openURL };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Devotional Library</Text>
          <Text style={styles.headerSubtitle}>
            {WEBVIEW_AVAILABLE ? `Read on ${host}, inside the app` : `Read on ${host}`}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stated once, at the top, rather than implied by a chevron on every
            row: these are website pages, not screens of this app. */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.stone[500]} />
          <Text style={styles.noticeText}>
            These collections are published on {host}. Opening one shows the live page, so it is
            always the current text.
          </Text>
        </View>

        {WEB.matchesEnvironment ? null : (
          <Text style={styles.warn}>
            This build talks to a different server than {host}, so the pages below are the
            production ones and may not describe this build.
          </Text>
        )}

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHead}>
              <Ionicons name={section.icon} size={16} color={section.tint} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.entries.map((entry) => {
              const target = {
                url: `${WEB.origin}/${entry.path}?utm_source=mobile-app&utm_medium=library`,
                title: entry.label,
              };
              const affordance = describeWebHandoff(target, handoffOpts, host);
              return (
                <TouchableOpacity
                  key={entry.path}
                  activeOpacity={0.85}
                  style={styles.row}
                  accessibilityRole={affordance.role}
                  accessibilityLabel={entry.label}
                  accessibilityHint={affordance.hint}
                  onPress={() => openWebHandoff(target, handoffOpts, io)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{entry.label}</Text>
                    <Text style={styles.rowBlurb}>{entry.blurb}</Text>
                  </View>
                  {/* The glyph is the affordance's, so a build that leaves the
                      app shows the external-link arrow and one that frames the
                      page shows a chevron. */}
                  <Ionicons name={affordance.icon} size={18} color={colors.stone[400]} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 44,
    height: 44,
    marginLeft: -spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.base, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  notice: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
    backgroundColor: colors.stone[100],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  noticeText: { flex: 1, fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 19 },
  warn: {
    fontSize: fontSize.sm,
    color: colors.saffron[800],
    backgroundColor: colors.saffron[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  section: { marginBottom: spacing.lg },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.stone[500],
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.xs,
  },
  rowTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  rowBlurb: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
});
