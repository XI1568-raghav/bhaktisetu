import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiPost } from '../../lib/api';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Account recovery for mobile — the door that did not exist.
 *
 * apps/web has shipped /auth/forgot-password and /auth/reset-password since
 * A-002 (2026-08-11). The app shipped neither, so a devotee who forgot their
 * password had NO route back into their account from the phone: email/password
 * is the primary door, phone OTP still answers "Unsupported phone provider"
 * (launch issue #196, Supabase SMS unconfigured), and nothing in the app ever
 * surfaced the magic link. That is a launch blocker, and it is what this screen
 * closes.
 *
 * WHY THE SIGN-IN LINK IS THE PRIMARY CONTROL HERE AND NOT ON THE WEB
 * ------------------------------------------------------------------
 * The web page leads with "Send reset link", which calls
 * `supabase.auth.resetPasswordForEmail` from the browser. That call has no
 * server-side equivalent: there is no `POST /auth/reset-password` in
 * apps/api/src/routes/auth.ts, and passwords do not live in our database at all
 * (there is no password column on User — Supabase Auth owns them). apps/mobile
 * does not depend on @supabase/supabase-js either, so the app genuinely cannot
 * originate a Supabase password reset. Inventing an endpoint to hide that would
 * ship a button that silently fails for every user who taps it.
 *
 * What the app CAN do end-to-end, today, with a real endpoint that has existed
 * for months, is `POST /api/v1/auth/magic-link/request` — the same second door
 * apps/web offers as "Email me a sign-in link instead". It mails a 15-minute
 * link, and following it signs the account in. For a user who has forgotten a
 * password that is a complete recovery, in-app, with no new API surface. So it
 * leads, and the password-reset path is offered honestly as what it is: a
 * hand-off to the website that really performs it.
 *
 * ENUMERATION
 * -----------
 * Mirrors the web page exactly: the success state is shown for ANY
 * syntactically valid address, and neither the API's status code nor a
 * transport failure is ever echoed. Anything else turns this screen into a free
 * "is this address registered?" oracle for a platform whose membership — caste,
 * sampradaya, temple affiliation — is itself sensitive. That is why every
 * outcome below funnels into the same `setStatus('sent')`.
 */

// Same predicate as apps/web/app/auth/forgot-password/page.tsx and the server's
// own check in apps/api/src/routes/magic-link.ts, so the three agree on what an
// address is before anything is sent.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * lib/api.ts's `apiPost` is a bare `fetch` with no AbortController, and a bare
 * fetch never settles on a half-open socket — captive portal, flaky mobile
 * data, a cold Render dyno. That is the exact defect behind the LIVE P0 in
 * TASKS.md: the line after the `await` never runs, so the spinner turns
 * forever and no error is ever shown. lib/api.ts is not this screen's file to
 * change, so the budget is enforced here instead. 20s matches the web client's
 * `fetchWithTimeout` budget in apps/web/lib/api-config.ts.
 *
 * Racing rather than aborting is sufficient *for this screen only* because
 * every outcome is deliberately indistinguishable anyway (see ENUMERATION): a
 * request that eventually lands after the race still sends the email, and a
 * request that never lands still shows the same copy.
 */
const REQUEST_TIMEOUT_MS = 20_000;

const WEB = webOrigin();

type Status = 'idle' | 'submitting' | 'sent';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const webHost = hostOf(WEB.origin);

  async function requestSignInLink() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      // Verbatim from the web page — one product, one sentence.
      setError('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setError('');

    try {
      await Promise.race([
        apiPost('/auth/magic-link/request', { email: trimmed }),
        new Promise((resolve) => setTimeout(resolve, REQUEST_TIMEOUT_MS)),
      ]);
    } catch {
      // Deliberately swallowed. `apiPost` throws on any non-2xx, and a 500 from
      // Resend, a 400, and an address with no account must be indistinguishable
      // from outside this screen.
    }

    setStatus('sent');
  }

  /**
   * The password-reset path, handed to the browser rather than faked here.
   *
   * SYSTEM BROWSER, NOT THE IN-APP WEBVIEW — and that is deliberate.
   * lib/in-app-web.ts makes the case in full: a chrome-less full-screen WebView
   * with no address bar, inside an app the devotee already trusts, is a
   * credential-harvesting surface that `Linking.openURL` never is, because the
   * system browser at least shows the host. The destination here is a page that
   * asks for a new password. That is precisely the page that must be framed
   * with an address bar, so this screen does not route through
   * `openWebHandoff`.
   */
  function openWebPasswordReset() {
    const url = `${WEB.origin}/auth/forgot-password`;
    try {
      const result = Linking.openURL(url);
      if (result && typeof result.catch === 'function') {
        // Linking rejects when no activity can handle the intent; an unhandled
        // rejection here would turn "no browser installed" into a red box on
        // the recovery screen.
        void result.catch(() => undefined);
      }
    } catch {
      // Same reasoning — the screen must survive a device with no browser.
    }
  }

  if (status === 'sent') {
    return (
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            {/*
              "If an account exists for" is load-bearing, not padding: this
              sentence is shown identically whether or not the address is
              registered, so it must never promise that it is.
            */}
            <Text style={styles.subtitle}>
              If an account exists for <Text style={styles.emphasis}>{email.trim()}</Text>,
              we&apos;ve sent a sign-in link. It expires in 15 minutes.
            </Text>
            <Text style={styles.fineprint}>
              Nothing arrived? Check spam, then try again — the link is only sent to
              registered addresses.
            </Text>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Try a different email address"
              onPress={() => {
                setStatus('idle');
                setError('');
              }}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.saffron[700]} />
              <Text style={styles.secondaryBtnText}>Use a different email</Text>
            </TouchableOpacity>
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
      </SafeAreaView>
    );
  }

  const busy = status === 'submitting';

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

          <View style={styles.header}>
            <Text style={styles.brand}>🕉 Darshya</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Can&apos;t sign in?</Text>
            <Text style={styles.subtitle}>
              Enter the email you signed up with and we&apos;ll send you a link that signs
              you straight in — no password needed.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.stone[400]}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError('');
              }}
              editable={!busy}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              // Both platforms, because they read different props: iOS uses
              // textContentType, Android's autofill service uses autoComplete.
              // A recovery screen is where a password manager helps most.
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!busy) void requestSignInLink();
              }}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.red[600]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              accessibilityLabel="Email me a sign-in link"
              onPress={() => void requestSignInLink()}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Email me a sign-in link</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/*
              Named for what it does. "Reset your password" alone would imply the
              app performs it; it does not, and the browser hand-off is visible
              in the label, the icon and the accessibility hint rather than
              discovered after the tap.
            */}
            <TouchableOpacity
              style={[styles.secondaryBtn, busy && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={busy}
              accessibilityRole="link"
              accessibilityLabel={`Reset your password on ${webHost}`}
              accessibilityHint={`Opens ${webHost} in your browser, where you can set a new password`}
              onPress={openWebPasswordReset}
            >
              <Ionicons name="open-outline" size={18} color={colors.saffron[700]} />
              <Text style={styles.secondaryBtnText}>Reset password on {webHost}</Text>
            </TouchableOpacity>
            <Text style={styles.fineprint}>
              Setting a new password happens on the website — the app cannot change a
              password yet. Your sign-in link above works either way.
            </Text>

            {/*
              The origin could not be derived from this build's API host, so it
              fell back to production. Saying nothing would send the devotee to a
              site that has never heard of their account. Same warning the
              payment hand-off in (devotee)/puja-book.tsx carries.
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
  header: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.sm },
  brand: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.saffron[700],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  successIcon: { alignItems: 'center', marginBottom: spacing.sm },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  emphasis: { fontWeight: '700', color: colors.stone[800] },
  fineprint: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.stone[700],
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.stone[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.stone[900],
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.red[600],
    lineHeight: 18,
  },
  warnText: {
    fontSize: fontSize.sm,
    color: colors.red[600],
    lineHeight: 18,
    marginTop: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  primaryBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.stone[200] },
  dividerText: { fontSize: fontSize.sm, color: colors.stone[500] },
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
