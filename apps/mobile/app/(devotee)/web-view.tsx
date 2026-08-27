import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isRenderableInApp } from '../../lib/in-app-web';
import { WebViewComp } from '../../lib/webview-module';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-22 — the website, inside the app.
 *
 * Several surfaces still live only on darshya.online (the AI Jyotish
 * assistant, the astrology service pages). Until PAR-22 they were reached with
 * `Linking.openURL`, which EXITS the app: the devotee lands in Chrome or
 * Safari, the app's back stack is gone, and returning means finding the app
 * again in the switcher. This screen is the same page without the exit.
 *
 * WHAT IT FIXES AND WHAT IT DOES NOT — the honest half
 * ---------------------------------------------------
 * It fixes the BACK STACK and the app-exit. It does NOT carry the session.
 * The app's session lives in expo-secure-store; the website's lives in
 * localStorage['poojly_session']. A WebView shares neither, so the devotee
 * signs in inside this frame exactly as they would in the browser. What
 * improves is that the WebView's own storage persists across visits within the
 * app, so the SECOND trip does not ask again. The header says so, because a
 * frame that looks like an app screen and then asks for a password has to
 * explain whose password it wants.
 *
 * DORMANT UNTIL THE MODULE IS INSTALLED — DELIBERATELY
 * ---------------------------------------------------
 * `react-native-webview` is not a declared dependency (an owner action: native
 * module, new EAS build, root lockfile). The require below therefore throws in
 * every build produced from this tree, exactly as it does in
 * app/(devotee)/darshan-player.tsx, and this screen renders its browser
 * hand-off instead. Nothing regresses today; everything improves the moment
 * `npx expo install react-native-webview` lands, with no further change here.
 *
 * NOT FOR THE PAYMENT HAND-OFF. READ THIS BEFORE REUSING IT.
 * ---------------------------------------------------------
 * The obvious next move is to point puja-book.tsx's "Pay on darshya.online"
 * button here. Do not. This screen cannot carry a Razorpay checkout, and the
 * reasons are mechanical:
 *
 *   · apps/web/app/bookings/pay/page.tsx constructs Razorpay Standard Checkout
 *     with no `method` restriction, so it offers UPI intent. Those buttons
 *     navigate to `upi:`/`intent:`/`phonepe:`/`tez:` URLs, which are not http
 *     and never reach a WebView's loader. Without an
 *     `onShouldStartLoadWithRequest` bridge into Linking they are silently
 *     inert — and UPI is the majority rail in this market, so the devotee
 *     would see a payment sheet whose main buttons do nothing.
 *   · apps/web/next.config.ts's CSP carries `frame-src` AND `form-action` for
 *     checkout.razorpay.com and api.razorpay.com: the issuer 3DS step is a
 *     cross-origin form post, and some issuers open a second window.
 *     `setSupportMultipleWindows={false}` below — deliberate, because a
 *     chrome-less frame that can spawn windows is a phishing surface — breaks
 *     exactly that.
 *   · the web page verifies the payment itself, with the WEB session's bearer.
 *     The app would learn nothing from the frame closing and would have to
 *     poll the booking to find out whether money moved.
 *
 * Native card payment needs `react-native-razorpay`, which is a separate
 * owner decision from `react-native-webview`. Guarded by
 * lib/__tests__/booking-quote-and-verification.par15.test.ts.
 *
 * THE URL IS NOT TRUSTED
 * ----------------------
 * expo-router derives its linking config from the FILE TREE, so
 * `darshya://(devotee)/web-view?url=…` is addressable from any link a devotee
 * can be induced to tap — lib/deep-link.ts's hand-written map does not
 * constrain it. A chrome-less WebView with no address bar inside a trusted app
 * is a credential-harvesting surface that the system browser is not, so the
 * param is re-checked against this build's own origin here, and not merely at
 * the call sites that push it.
 */

const WEB = webOrigin();

export default function InAppWebScreen() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const url = typeof params.url === 'string' ? params.url : '';
  const title = (typeof params.title === 'string' && params.title) || hostOf(WEB.origin);

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const canGoBack = useRef(false);
  const webRef = useRef<{ goBack?: () => void } | null>(null);

  const allowed = isRenderableInApp(url, WEB.origin);
  /**
   * Capitalised local, and not `WebViewComp !== null` inline in the JSX: TS
   * cannot narrow a module-level `let`-shaped import through a boolean held in
   * another variable, and a lower-case identifier is parsed by JSX as an
   * intrinsic element. Both are compile errors rather than runtime ones, which
   * is the point — this file's guards are source scans, and tsc is what
   * actually proves the component is used correctly.
   */
  const Frame = WebViewComp;
  const renderable = allowed && Frame !== null;

  /**
   * Android hardware back goes back through the WEB history first — that is
   * most of what this screen buys over the browser. Without it the first back
   * press pops the whole screen and the devotee loses their place on the site.
   */
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (renderable && canGoBack.current && webRef.current?.goBack) {
          webRef.current.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [renderable]),
  );

  function openInBrowser() {
    if (!allowed) return;
    void Promise.resolve(Linking.openURL(url)).catch(() => undefined);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {/* The host, always visible. This frame has no address bar, and a
              page that can ask for a password must never hide whose page it
              is — that is the whole reason the origin check exists. */}
          <Text style={styles.subtitle} numberOfLines={1}>
            {hostOf(WEB.origin)}
          </Text>
        </View>
        {allowed ? (
          <TouchableOpacity
            onPress={openInBrowser}
            style={styles.backBtn}
            accessibilityRole="link"
            accessibilityLabel={`Open on ${hostOf(WEB.origin)} in your browser`}
            accessibilityHint="Leaves the app and opens this page in your browser"
          >
            <Ionicons name="open-outline" size={20} color={colors.stone[600]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!allowed ? (
        /* A URL that is not this site. Never framed, never opened — opening it
           would make this screen a redirector for whoever wrote the link. */
        <View style={styles.fallback}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.fallbackTitle}>That link is not part of Darshya</Text>
          <Text style={styles.fallbackText}>
            This screen only opens pages on {hostOf(WEB.origin)}. Nothing was
            loaded.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            accessibilityRole="button"
            onPress={() => router.back()}
          >
            <Text style={styles.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : renderable && Frame && !failed ? (
        <View style={styles.frame}>
          <Frame
            ref={webRef as never}
            source={{ uri: url }}
            style={styles.webview}
            /* The whole point: the jar persists across visits within the app,
               so signing in on this page is not repeated every trip. It is
               still the WEBSITE's session — the app's lives in secure store
               and cannot be handed over. */
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            originWhitelist={[`${WEB.origin}/*`]}
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            onNavigationStateChange={(state) => {
              canGoBack.current = state.canGoBack === true;
            }}
          />
          {loading ? (
            <View style={styles.loading} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.saffron[500]} />
            </View>
          ) : null}
        </View>
      ) : (
        /* Either the module is absent — which is every build from this tree
           today — or the page failed to load inside the frame. Both end at the
           browser, which is precisely the behaviour this screen replaced, so
           nothing is worse than it was. */
        <View style={styles.fallback}>
          <Ionicons name="globe-outline" size={48} color={colors.saffron[300]} />
          <Text style={styles.fallbackTitle}>
            {failed ? 'This page did not load here' : 'Opens in your browser'}
          </Text>
          <Text style={styles.fallbackText}>
            {failed
              ? `Open it on ${hostOf(WEB.origin)} instead.`
              : `This build cannot show ${hostOf(
                  WEB.origin,
                )} inside the app yet, so it will open in your browser.`}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="link"
            accessibilityLabel={`Open on ${hostOf(WEB.origin)}`}
            accessibilityHint={`Leaves the app and opens ${hostOf(
              WEB.origin,
            )} in your browser`}
            onPress={openInBrowser}
          >
            <Ionicons name="open-outline" size={16} color={colors.white} />
            <Text style={styles.primaryBtnText}>Open on {hostOf(WEB.origin)}</Text>
          </TouchableOpacity>
          {/* The build-mismatch warning lib/web-origin.ts exists to make
              possible: a LAN or staging build must not silently send a devotee
              to production. */}
          {WEB.matchesEnvironment ? null : (
            <Text style={styles.warn}>
              This build talks to a different server than {hostOf(WEB.origin)}.
              Set EXPO_PUBLIC_WEB_URL to the website that pairs with it.
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: { padding: spacing.xs },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500] },
  frame: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.white },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  fallbackTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[800],
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.saffron[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  primaryBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  warn: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.red[600],
    textAlign: 'center',
  },
});
