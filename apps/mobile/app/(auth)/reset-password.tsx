import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The landing screen for a password-reset link opened on the phone.
 *
 * WHAT THIS SCREEN DELIBERATELY DOES NOT DO, AND WHY
 * -------------------------------------------------
 * It does not collect a new password, because nothing in this system can
 * accept one from the app.
 *
 *   - There is no password-set endpoint. The routes in
 *     apps/api/src/routes/auth.ts are send-otp, verify-otp, refresh,
 *     session/revive, logout, me, login, signup, register and google/sync.
 *     None of them takes a password to write, and there is no password column
 *     on User at all — Supabase Auth owns credentials.
 *   - apps/web performs the reset entirely in the browser, with
 *     `supabase.auth.updateUser({ password })` against a recovery session that
 *     Supabase established from the URL **fragment** (`#access_token=…&
 *     type=recovery`). A fragment never reaches a server, and expo-router's
 *     deep-link parsing (lib/deep-link.ts) reads `url.pathname` only, so the
 *     credential the web page depends on cannot arrive here even in principle.
 *   - apps/mobile does not depend on @supabase/supabase-js, so there is no
 *     client here that could consume such a fragment if it did arrive.
 *
 * A password form wired to an endpoint that does not exist would be a control
 * that fails for every user who completes it — worse than no screen, because it
 * looks like recovery. So the form is absent on purpose, and the hand-off to
 * the page that genuinely performs the reset is the whole screen. The moment
 * the API grows `POST /api/v1/auth/reset-password { token, password }`, the
 * form belongs here and the hand-off can go.
 *
 * WHAT IT DOES DO
 * ---------------
 * It accepts `token` via useLocalSearchParams, so the route is already correct
 * for the day deep linking is wired (the entry needed in lib/deep-link.ts is
 * reported with this change; that file belongs to another lane). The token is
 * used only to tell two situations apart — arrived from a real link, or opened
 * cold — and is never rendered, logged, or put in a URL. It is a credential.
 */

const WEB = webOrigin();

/** Longer than any token we mint; a guard against a pathological param. */
const MAX_TOKEN_LEN = 4096;

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();

  const rawToken = typeof params.token === 'string' ? params.token.trim() : '';
  const hasToken = rawToken.length > 0 && rawToken.length <= MAX_TOKEN_LEN;

  // Shown back to the user only as a reminder of which account they asked
  // about. Never used to look anything up, so it cannot leak whether it exists.
  const email = typeof params.email === 'string' ? params.email.trim() : '';

  const webHost = hostOf(WEB.origin);

  /**
   * SYSTEM BROWSER, NOT THE IN-APP WEBVIEW.
   *
   * lib/in-app-web.ts states the rule this follows: a chrome-less full-screen
   * WebView with no address bar, inside an app the devotee already trusts, is a
   * credential-harvesting surface that `Linking.openURL` never is, because the
   * system browser shows the host. The destination is the page that asks for a
   * new password, which is exactly the page that must show its address bar. So
   * this does not route through `openWebHandoff`.
   *
   * The target is /auth/forgot-password rather than /auth/reset-password:
   * Supabase's recovery session is single-use and lives in the fragment of the
   * email's own link, which this screen cannot carry across, so the web page
   * must mint a fresh one. Sending the user to /auth/reset-password directly
   * would land them on that page's "this link is no longer valid" state.
   *
   * No email is appended to the URL. A recovery address in a query string ends
   * up in browser history and in any shared-cache log between here and there.
   */
  function openWebPasswordReset() {
    const url = `${WEB.origin}/auth/forgot-password`;
    try {
      const result = Linking.openURL(url);
      if (result && typeof result.catch === 'function') {
        // Linking rejects when no activity can handle the intent; an unhandled
        // rejection would turn "no browser installed" into a red box on the
        // recovery screen.
        void result.catch(() => undefined);
      }
    } catch {
      // Same reasoning — the screen must survive a device with no browser.
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.stone[700]} />
          </TouchableOpacity>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons
                name={hasToken ? 'lock-open-outline' : 'alert-circle'}
                size={44}
                color={hasToken ? colors.saffron[600] : colors.amber[500]}
              />
            </View>

            {hasToken ? (
              <>
                <Text style={styles.title}>Finish on the website</Text>
                <Text style={styles.subtitle}>
                  {email ? (
                    <>
                      You asked to reset the password for{' '}
                      <Text style={styles.emphasis}>{email}</Text>.{' '}
                    </>
                  ) : null}
                  Choosing a new password happens on {webHost} — the app cannot set one
                  yet. It takes a moment and you&apos;ll come straight back.
                </Text>
              </>
            ) : (
              <>
                {/*
                  Same distinction the web page draws: an expired or missing link
                  is told apart from a generic failure on purpose. "Request a new
                  one and it will work" is the difference between a user
                  recovering and a user giving up.
                */}
                <Text style={styles.title}>This link is no longer valid</Text>
                <Text style={styles.subtitle}>
                  Password reset links expire an hour after they are sent, and can only
                  be used once. Request a fresh one and it will work.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              accessibilityRole="link"
              accessibilityLabel={`Set a new password on ${webHost}`}
              accessibilityHint={`Opens ${webHost} in your browser, where you can send yourself a reset link and choose a new password`}
              onPress={openWebPasswordReset}
            >
              <Ionicons name="open-outline" size={18} color={colors.white} />
              <Text style={styles.primaryBtnText}>Set a new password on {webHost}</Text>
            </TouchableOpacity>

            {/*
              The in-app alternative, and for many accounts the better one: a
              magic sign-in link is a real endpoint the app calls itself, and for
              a provider onboarded through partnerships it is the ONLY credential
              they have — there is no password to reset.
            */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Email me a sign-in link instead"
              onPress={() => router.replace('/(auth)/forgot-password')}
            >
              <Ionicons name="mail-outline" size={18} color={colors.saffron[700]} />
              <Text style={styles.secondaryBtnText}>Email me a sign-in link instead</Text>
            </TouchableOpacity>
            <Text style={styles.fineprint}>
              Joined as a pandit, temple or partner? Your account signs in by link, not
              by password — use this.
            </Text>

            {/*
              Origin fell back to production because it could not be derived from
              this build's API host. Mirrors the warning the payment hand-off in
              (devotee)/puja-book.tsx carries, for the same reason: a silent
              cross-environment hand-off sends the user to a site that has never
              heard of their account.
            */}
            {WEB.matchesEnvironment ? null : (
              <Text style={styles.warnText}>
                This build talks to a different server than {webHost}, so that site may
                not know this account. Set EXPO_PUBLIC_WEB_URL to the website that pairs
                with this build&apos;s API.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.footerLink}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            onPress={() => router.replace('/(auth)/login')}
          >
            <Ionicons name="arrow-back" size={16} color={colors.stone[600]} />
            <Text style={styles.footerLinkText}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.saffron[50] },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    // SafeAreaView supplies the real top inset; this is the design gap only.
    paddingTop: spacing.md,
  },
  back: { width: 40, height: 40, justifyContent: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconWrap: { alignItems: 'center', marginBottom: spacing.md },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emphasis: { fontWeight: '700', color: colors.stone[800] },
  fineprint: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 18,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  warnText: {
    fontSize: fontSize.sm,
    color: colors.red[600],
    lineHeight: 18,
    marginTop: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
    flexShrink: 1,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.saffron[200],
    marginTop: spacing.md,
  },
  secondaryBtnText: {
    color: colors.saffron[700],
    fontSize: fontSize.base,
    fontWeight: '700',
    flexShrink: 1,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  footerLinkText: { fontSize: fontSize.base, color: colors.stone[600], fontWeight: '600' },
});
