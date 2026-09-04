import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from './theme';

/** Icon + label box. Unchanged from the old fixed bars, on every device. */
const TAB_BAR_CONTENT_HEIGHT = 50;
const TAB_BAR_PADDING_TOP = 6;
/** Breathing room where the system reserves nothing (3-button nav, iPad). */
const TAB_BAR_MIN_PADDING_BOTTOM = 8;

/**
 * Bottom tab bar geometry that respects the device's bottom inset.
 *
 * Every role bar used to hard-code `height: Platform.OS === 'ios' ? 88 : 64`
 * with a matching fixed `paddingBottom`, which overrode React Navigation's own
 * inset handling. On Android 15 (targetSdk 35 forces edge-to-edge) the gesture
 * bar then sat over the labels and the lower half of every tab's touch target;
 * on iOS a fixed 88 was wrong for any home-indicator inset other than 34, so an
 * iPhone SE or an iPad carried 28pt of empty bar.
 *
 * The content box stays exactly TAB_BAR_CONTENT_HEIGHT tall everywhere — only
 * the padding beneath it grows to clear whatever the system actually reserves.
 *
 * This is a hook: call it from a component body, not from a StyleSheet.
 */
export function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom || TAB_BAR_MIN_PADDING_BOTTOM;
  return {
    height: TAB_BAR_CONTENT_HEIGHT + TAB_BAR_PADDING_TOP + paddingBottom,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom,
  };
}

interface PortalScreenProps {
  title: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export function PortalScreen({
  title,
  subtitle,
  refreshing,
  onRefresh,
  children,
}: PortalScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {children}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}

export function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>
        {value}
      </Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function Section({ title, children, action }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

interface RowProps {
  primary: string;
  secondary?: string;
  trailing?: string;
  trailingHint?: string;
  status?: { label: string; color: string };
}

export function ListRow({ primary, secondary, trailing, trailingHint, status }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowPrimary} numberOfLines={1}>
          {primary}
        </Text>
        {secondary ? (
          <Text style={styles.rowSecondary} numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
      {status ? (
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${status.color}1A`, borderColor: status.color },
          ]}
        >
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      ) : null}
      {trailing ? (
        <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
          <Text style={styles.rowTrailing}>{trailing}</Text>
          {trailingHint ? (
            <Text style={styles.rowTrailingHint}>{trailingHint}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: 4,
  },
  statHint: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    marginTop: 2,
  },
  section: { marginTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  rowPrimary: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[900],
  },
  rowSecondary: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginTop: 2,
  },
  rowTrailing: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.saffron[700],
  },
  rowTrailingHint: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  empty: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.stone[400],
  },
});
