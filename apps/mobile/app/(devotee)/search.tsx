import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  Linking,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  MIN_QUERY_LENGTH,
  canSearch,
  normalizeQuery,
  searchResultDestination,
  selectContentSearchResults,
  selectSearchTotal,
  selectTempleSearchResults,
  type SearchResultVM,
} from '../../lib/search';
import { useContentSearch, useTempleSearch } from '../../lib/search-queries';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-22 (B). The search the app was said not to be able to have.
 *
 * The home screen used to render a magnifying glass over the placeholder
 * "Search pujas, temples, content…" whose onPress was a plain tab push. The
 * previous remediation relabelled it "Browse all pujas" and recorded the
 * reason as "there is no in-app search endpoint to wire it to". That reason
 * was wrong: GET /api/v1/temples/search and GET /api/v1/content/search have
 * been live and public the whole time. This screen wires both.
 *
 * Honesty rules this screen keeps:
 *   · Nothing is queried below MIN_QUERY_LENGTH, because both routes answer a
 *     short query with an empty 200 and "No results" for two keystrokes is a
 *     lie about the catalogue.
 *   · A failed request says it failed. It does NOT fall through to an empty
 *     list, which reads as "we have nothing" — the PAR-02..07 failure mode.
 *   · A row that leaves the app says so, on the row and to a screen reader.
 *     Live temples stay in the app on the darshan player.
 *   · Counts come from the server's `total`, never from the rendered length.
 *
 * Not searched here: pujas. There is no /pujas/search route — the catalogue
 * endpoint has no `q` — so offering one would be the same disguise in a new
 * place. docs/mobile-v1-scope.md records that as a deliberate v1 exclusion.
 */

interface Section {
  title: string;
  countLabel: string;
  data: SearchResultVM[];
}

function ResultRow({ result }: { result: SearchResultVM }) {
  const dest = searchResultDestination(result);
  const leavesApp = !dest.inApp;
  const icon: React.ComponentProps<typeof Ionicons>['name'] =
    result.kind === 'temple' ? 'business-outline' : 'musical-notes-outline';

  const open = () => {
    if (dest.inApp) {
      router.push({ pathname: dest.pathname as never, params: dest.params } as never);
    } else {
      Linking.openURL(dest.url);
    }
  };

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.75}
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={result.title}
      accessibilityHint={
        leavesApp
          ? 'Opens darshya.online in your browser'
          : 'Opens the live darshan player in the app'
      }
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.saffron[600]} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {result.title}
        </Text>
        {result.subtitle.length > 0 && (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {result.subtitle}
          </Text>
        )}
      </View>
      {result.isLive && (
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}
      {result.isPremium && (
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumBadgeText}>PREMIUM</Text>
        </View>
      )}
      <Ionicons
        name={leavesApp ? 'open-outline' : 'chevron-forward'}
        size={16}
        color={colors.stone[400]}
      />
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const trimmed = normalizeQuery(query);
  const active = canSearch(query);

  const temples = useTempleSearch(query);
  const content = useContentSearch(query);

  const templeRows = useMemo(
    () => (active ? selectTempleSearchResults(temples.data) : []),
    [active, temples.data],
  );
  const contentRows = useMemo(
    () => (active ? selectContentSearchResults(content.data) : []),
    [active, content.data],
  );

  const loading = active && (temples.isLoading || content.isLoading);
  // A partial failure is still a failure: reporting only the half that
  // answered would present a truncated catalogue as the whole one.
  const failed = active && (temples.isError || content.isError);

  const sections: Section[] = useMemo(() => {
    const out: Section[] = [];
    if (templeRows.length > 0) {
      const total = selectSearchTotal(temples.data, templeRows.length);
      out.push({
        title: 'Temples',
        countLabel: total > templeRows.length ? `${templeRows.length} of ${total}` : `${total}`,
        data: templeRows,
      });
    }
    if (contentRows.length > 0) {
      const total = selectSearchTotal(content.data, contentRows.length);
      out.push({
        title: 'Aarti, chalisa & mantras',
        countLabel: total > contentRows.length ? `${contentRows.length} of ${total}` : `${total}`,
        data: contentRows,
      });
    }
    return out;
  }, [templeRows, contentRows, temples.data, content.data]);

  const empty = active && !loading && !failed && sections.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.stone[700]} />
        </TouchableOpacity>
        <View style={styles.field}>
          <Ionicons name="search-outline" size={18} color={colors.stone[500]} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search temples and aartis"
            placeholderTextColor={colors.stone[400]}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Search temples and devotional content"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.stone[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!active && (
        <View style={styles.state}>
          <Ionicons name="search-outline" size={36} color={colors.stone[300]} />
          <Text style={styles.stateTitle}>
            {trimmed.length === 0
              ? 'Search temples and devotional content'
              : `Keep typing — at least ${MIN_QUERY_LENGTH} letters`}
          </Text>
          <Text style={styles.stateText}>
            Try a temple, a city, or a deity — “Kashi”, “Varanasi”, “Shiva”.
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.state}>
          <ActivityIndicator color={colors.saffron[600]} />
        </View>
      )}

      {failed && (
        <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.stone[400]} />
          {/* Never an empty list here: "no results" and "we could not ask"
              are different facts and the devotee acts on them differently. */}
          <Text style={styles.stateTitle}>Search is unavailable right now</Text>
          <Text style={styles.stateText}>
            We could not reach the server, so this is not a complete list.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              temples.refetch();
              content.refetch();
            }}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {empty && (
        <View style={styles.state}>
          <Ionicons name="leaf-outline" size={36} color={colors.stone[300]} />
          <Text style={styles.stateTitle}>No matches for “{trimmed}”</Text>
          <Text style={styles.stateText}>
            Search covers temples and devotional content. Pujas are in the Pujas
            tab.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.push('/(devotee)/pujas' as never)}
            accessibilityRole="link"
            accessibilityLabel="Browse all pujas"
            accessibilityHint="Opens the Pujas tab"
          >
            <Text style={styles.retryBtnText}>Browse all pujas</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !failed && sections.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.countLabel}</Text>
            </View>
          )}
          renderItem={({ item }) => <ResultRow result={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[200],
  },
  backBtn: { padding: spacing.xs },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.stone[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: { flex: 1, fontSize: fontSize.base, color: colors.stone[900], padding: 0 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  stateTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[700],
    textAlign: 'center',
  },
  stateText: { fontSize: fontSize.sm, color: colors.stone[500], textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[600],
  },
  retryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  list: { paddingBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[600] },
  sectionCount: { fontSize: fontSize.xs, color: colors.stone[400] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[800] },
  rowSubtitle: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  liveBadge: {
    backgroundColor: colors.red[600],
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  premiumBadge: {
    backgroundColor: colors.amber[600],
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
});
