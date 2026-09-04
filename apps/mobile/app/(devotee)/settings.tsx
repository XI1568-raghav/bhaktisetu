import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { webOrigin, hostOf } from '../../lib/web-origin';
import {
  openWebHandoff,
  describeWebHandoff,
  type WebHandoff,
} from '../../lib/in-app-web';
import { WEBVIEW_AVAILABLE } from '../../lib/webview-module';

/**
 * Settings — the screen the Profile row has always advertised and never had.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * `app/(devotee)/profile.tsx` shipped a "Settings — Language, notifications,
 * privacy" row whose only behaviour was an `Alert.alert` apologising that the
 * feature did not exist yet. Two separate problems sat in that one row.
 *
 * The first is a store-review problem. Google Play's pre-launch report and its
 * human reviewers file advertised-but-inert UI under Broken Functionality /
 * Minimum Functionality, and Apple does the same under Guideline 2.1; the
 * Profile screen carried six such controls at once. The second is harder:
 * Play's Data Safety declaration requires a privacy policy reachable from
 * INSIDE the app, and App Review expects the same plus terms. The app had
 * neither. `apps/web` has served /privacy and /terms the whole time — nothing
 * in the bundle pointed at them.
 *
 * WHAT IS DELIBERATELY NOT HERE: A LANGUAGE SWITCHER
 * --------------------------------------------------
 * The row promised "Language". There is no i18n layer in apps/mobile — no
 * i18next, no react-intl, no expo-localization, no message catalogue; every
 * string in every screen is an English literal. The API does store a
 * `preferredLanguage` and localises SOME of its error bodies from it, so a
 * switcher here could be made to compile and even to persist. It would change
 * almost nothing a devotee can see, while announcing that the app speaks their
 * language. That is a worse lie than the alert it replaced, so the language
 * line below is a statement of fact with no control attached to it.
 *
 * NOTIFICATIONS
 * -------------
 * `lib/push-notifications.ts` registers the device through expo-notifications
 * and there is no per-topic preference endpoint to drive. The only switch that
 * genuinely exists is the OS permission, so that is the one this screen opens.
 * A row of in-app toggles backed by nothing would be the same defect again.
 */

const WEB = webOrigin();

const HANDOFF_OPTS = { webViewAvailable: WEBVIEW_AVAILABLE, origin: WEB.origin };

/**
 * The two documents a store reviewer looks for. URLs are built from
 * `lib/web-origin.ts` rather than written out, so a development or staging
 * build links to ITS OWN site instead of production — the same rule the
 * payment hand-off in `puja-book.tsx` follows.
 */
const PRIVACY_TARGET: WebHandoff = {
  url: `${WEB.origin}/privacy`,
  title: 'Privacy Policy',
};

const TERMS_TARGET: WebHandoff = {
  url: `${WEB.origin}/terms`,
  title: 'Terms of Service',
};

/**
 * A settings row. `onPress` is REQUIRED — the profile screen's row component
 * made it optional and defaulted to an apologetic alert, which is precisely
 * how six inert controls survived review after review. A row that cannot be
 * built without a handler cannot become one.
 */
function SettingsRow({
  icon,
  color,
  label,
  subtitle,
  onPress,
  accessibilityRole = 'button',
  accessibilityHint,
  chevron = 'chevron-forward',
  destructive = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  subtitle: string;
  onPress: () => void;
  accessibilityRole?: 'button' | 'link';
  accessibilityHint?: string;
  chevron?: 'chevron-forward' | 'open-outline';
  /** Colours the label to match its icon. For rows that destroy something. */
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, destructive && { color }]}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name={chevron} size={18} color={colors.stone[300]} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const host = hostOf(WEB.origin);
  const privacy = describeWebHandoff(PRIVACY_TARGET, HANDOFF_OPTS, host);
  const terms = describeWebHandoff(TERMS_TARGET, HANDOFF_OPTS, host);

  function openLegal(target: WebHandoff) {
    openWebHandoff(target, HANDOFF_OPTS, {
      push: (r) => router.push(r as never),
      openExternal: Linking.openURL,
    });
  }

  function openDeviceSettings() {
    // Linking.openSettings rejects on a device with no settings activity to
    // handle the intent. Telling the devotee where to go by hand is a worse
    // outcome than the deep link, and a far better one than a red box.
    void Linking.openSettings().catch(() => {
      Alert.alert(
        'Could not open settings',
        'Open your device Settings app, find Darshya in the app list, and change its notification permission there.',
      );
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Notifications, privacy, and terms</Text>
        </View>
        <Ionicons name="settings-outline" size={24} color={colors.stone[500]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="notifications-outline"
            color={colors.saffron[600]}
            label="Notification permissions"
            subtitle="Open Darshya's settings on this device"
            onPress={openDeviceSettings}
            accessibilityHint="Opens this device's settings app"
          />
        </View>
        <Text style={styles.note}>
          Darshya uses notifications for booking updates and darshan reminders. The device
          permission is the only control today — there is no per-topic switch yet.
        </Text>

        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="shield-checkmark-outline"
            color={colors.green[600]}
            label="Privacy Policy"
            subtitle={`What we collect and why — on ${host}`}
            onPress={() => openLegal(PRIVACY_TARGET)}
            accessibilityRole={privacy.role}
            accessibilityHint={privacy.hint}
            chevron={privacy.icon}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="document-text-outline"
            color={colors.stone[600]}
            label="Terms of Service"
            subtitle={`The agreement you book under — on ${host}`}
            onPress={() => openLegal(TERMS_TARGET)}
            accessibilityRole={terms.role}
            accessibilityHint={terms.hint}
            chevron={terms.icon}
          />
        </View>

        <Text style={styles.sectionTitle}>Language</Text>
        {/*
          Not a control. See the module note: there is no i18n layer in this
          app, so a switcher here would move a setting and change nothing the
          devotee reads. A plain statement is the honest form.
        */}
        <View style={styles.infoCard}>
          <Ionicons name="language-outline" size={20} color={colors.stone[400]} />
          <View style={styles.rowInfo}>
            <Text style={styles.infoLabel}>English only</Text>
            <Text style={styles.infoText}>
              The Darshya app is not translated yet, so there is nothing to switch between.
              Temple, puja and content names appear in their own scripts where we have them.
            </Text>
          </View>
        </View>

        {WEB.matchesEnvironment ? null : (
          <Text style={styles.warn}>
            This build talks to a different server than {host}, so the pages above are the
            production ones and may not describe this build.
          </Text>
        )}

        {/*
          ACCOUNT DELETION — deliberately last, in its own section, separated
          from the ordinary rows by a rule.

          Apple Guideline 5.1.1(v) requires that an app offering account
          creation offer account deletion FROM INSIDE THE APP; a link out to a
          website does not satisfy it, and Google Play requires the in-app path
          as well. `apps/api/src/routes/account.ts` has served the whole
          deletion pipeline since LC-DEL landed with nothing pointing at it, so
          until this row existed neither store requirement was actually met.

          It routes to a screen rather than firing a confirmation dialog here:
          the flow has real blockers to render (unsettled earnings, in-flight
          bookings), a wallet-forfeit acknowledgement, and a 6-digit
          confirmation code. None of that fits in an Alert, and an irreversible
          action should never be one tap deep.
        */}
        <View style={styles.dangerDivider} />
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Account</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <SettingsRow
            icon="trash-outline"
            color={colors.red[600]}
            label="Delete account"
            subtitle="Permanently delete your Darshya account and personal data"
            onPress={() => router.push('/(devotee)/delete-account' as never)}
            accessibilityHint="Opens the account deletion screen. Nothing is deleted until you confirm with a code."
            destructive
          />
        </View>
        <Text style={styles.note}>
          Deletion runs after a 30-day grace period, and you can cancel at any point during it.
          Bookings, payments and donation receipts are kept in anonymised form because Indian
          tax law requires it.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerLogo}>{'Darshya ॐ'}</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
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
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[700],
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: { flex: 1 },
  rowLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[900],
    marginBottom: 1,
  },
  rowSubtitle: { fontSize: fontSize.sm, color: colors.stone[400] },
  divider: { height: 1, backgroundColor: colors.stone[100], marginLeft: 64 },
  note: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  infoLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[700],
    marginBottom: 2,
  },
  infoText: { fontSize: fontSize.sm, color: colors.stone[400], lineHeight: 18 },
  warn: {
    fontSize: fontSize.xs,
    color: colors.amber[600],
    marginTop: spacing.md,
    lineHeight: 16,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: colors.stone[200],
    marginTop: spacing.xl,
  },
  dangerTitle: { color: colors.red[600] },
  dangerCard: { borderColor: '#FECACA' },
  footer: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
  footerLogo: { fontSize: fontSize.xl, fontWeight: '700', color: colors.saffron[600] },
  footerVersion: { fontSize: fontSize.sm, color: colors.stone[400] },
});
