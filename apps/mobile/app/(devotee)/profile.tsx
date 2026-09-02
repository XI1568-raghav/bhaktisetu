import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, useBookings, useUserAddresses } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { selectAddresses, selectBookingTotal } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { HAS_80G } from '../../lib/eighty-g';
import { HELP_CENTRE_LABEL, openHelpCentre } from '../../lib/help-centre';
import { webOrigin, hostOf } from '../../lib/web-origin';
import { openWebHandoff, type WebHandoff } from '../../lib/in-app-web';
import { WEBVIEW_AVAILABLE } from '../../lib/webview-module';
import { NRI_PREMIUM_IS_SELLABLE } from '../../lib/nri-premium-availability';
// AUTH-09: the confirmation used to ask "Are you sure?" without saying what
// it was sure about. POST /auth/logout defaults to scope 'global'.
import { SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE } from '../../lib/signout-copy';

/**
 * SIX DEAD CONTROLS — and why the fix is a type, not six handlers.
 *
 * This screen used to end `handleQuickLink` with an `Alert.alert` apologising
 * that the feature was not built yet, and `LinkRow` defaulted an ABSENT
 * `onPress` to the same apology. Between them, `subscription`,
 * `settings`, `help`, `about`, `share` and the Edit Profile button all
 * advertised a feature and delivered an apology. Google Play files
 * advertised-but-inert UI under Broken Functionality / Minimum Functionality and
 * Apple under Guideline 2.1, so this was a review risk on both stores as well as
 * a lie to the devotee.
 *
 * Wiring the six is only half of it. The structural half is that BOTH escape
 * hatches are gone: `LinkRow.onPress` is required, so a row cannot be rendered
 * without a handler; and `handleQuickLink` takes the `QuickLinkId` union and
 * ends in a `never` assignment, so adding an id to either list below without
 * handling it fails `tsc` instead of shipping another apology.
 */
type QuickLinkId =
  | 'bookings'
  | 'messages'
  | 'consultations'
  | 'subscription'
  | 'addresses'
  | 'settings'
  | 'list-business'
  | 'support'
  | 'help'
  | 'about'
  | 'share';

interface QuickLink {
  id: QuickLinkId;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle: string;
  color: string;
  badge?: string;
}

/**
 * The website this build belongs to. Never `https://darshya.online` written out
 * — a development build must hand off to ITS OWN site. See lib/web-origin.ts.
 */
const WEB = webOrigin();

const HANDOFF_OPTS = { webViewAvailable: WEBVIEW_AVAILABLE, origin: WEB.origin };

const ABOUT_TARGET: WebHandoff = {
  url: `${WEB.origin}/about`,
  title: 'About Darshya',
};

const quickLinks: QuickLink[] = [
  {
    id: 'bookings',
    icon: 'calendar',
    label: 'My Bookings',
    subtitle: 'View puja and darshan bookings',
    color: colors.saffron[600],
    badge: '3',
  },
  {
    id: 'messages',
    icon: 'chatbubble-ellipses',
    label: 'Messages',
    subtitle: 'Chat with priests, astrologers, and providers',
    color: colors.saffron[500],
  },
  {
    id: 'consultations',
    icon: 'star',
    label: 'My Consultations',
    subtitle: 'Astrologer sessions — upcoming & history',
    color: colors.amber[600],
  },
  {
    id: 'subscription',
    icon: 'diamond',
    label: 'Subscription',
    // The row is KEPT and routed to (devotee)/upgrade even though
    // NRI_PREMIUM_IS_SELLABLE is false — see `handleQuickLink` for why. What
    // changes with the gate is the promise: "manage your Premium" is not
    // something this row can deliver while nothing is on sale.
    subtitle: NRI_PREMIUM_IS_SELLABLE
      ? 'Manage your Darshya Premium'
      : 'Plan status — Premium is not on sale',
    color: colors.amber[500],
  },
  {
    id: 'addresses',
    icon: 'location',
    label: 'Addresses',
    subtitle: 'Saved delivery addresses for prasad',
    color: colors.green[600],
  },
  {
    id: 'settings',
    icon: 'settings',
    label: 'Settings',
    // Was "Language, notifications, privacy". There is no i18n layer in this
    // app, so the settings screen deliberately ships no language switcher and
    // this subtitle no longer promises one. See app/(devotee)/settings.tsx.
    subtitle: 'Notifications, privacy, and terms',
    color: colors.stone[600],
  },
];

const moreLinks: QuickLink[] = [
  {
    id: 'list-business',
    icon: 'business',
    label: 'List your business',
    subtitle: 'Temple, gaushala, pandit, astrologer or wellness',
    color: colors.saffron[600],
  },
  {
    /*
     * Until this row existed, `app/(devotee)/support.tsx` was ORPHANED: a
     * `grep -rn "devotee)/support" apps/mobile/app` matched only a COMMENT.
     * The screen was built, declared `href: null` in _layout.tsx, and reachable
     * from nowhere — so filing a support ticket was impossible from the phone,
     * whatever the tab bar or the route table said. This is the only control in
     * the app that opens it.
     *
     * It sits ABOVE Help Center deliberately: the two are different promises.
     * Help Center is self-serve articles on the web; this is a human, and the
     * subtitle says which.
     */
    id: 'support',
    icon: 'chatbox-ellipses',
    label: 'Contact Support',
    subtitle: 'File a ticket and read replies from our team',
    color: colors.amber[600],
  },
  {
    id: 'help',
    icon: 'help-circle',
    // I18N-09 named the destination in the label so a control cannot advertise
    // one place and open another; the same rule applies to the subtitle, which
    // used to promise "customer support" this row does not reach.
    label: HELP_CENTRE_LABEL,
    subtitle: `Guides and FAQs on ${hostOf(WEB.origin)}`,
    color: colors.stone[500],
  },
  {
    id: 'about',
    icon: 'information-circle',
    label: 'About Darshya',
    subtitle: `Our mission and story on ${hostOf(WEB.origin)}`,
    color: colors.saffron[500],
  },
  {
    id: 'share',
    icon: 'share-social',
    label: 'Share App',
    subtitle: 'Invite friends and family',
    color: colors.green[500],
  },
];

interface OnboardOption {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  href: string;
}

const ONBOARD_OPTIONS: OnboardOption[] = [
  {
    id: 'temple',
    label: 'List your temple',
    subtitle: `Live darshan, puja bookings, ${HAS_80G ? '80G donations' : 'donations'}`,
    icon: 'home',
    href: '/(onboard)/list-temple',
  },
  {
    id: 'priest',
    label: 'Become a pandit',
    subtitle: 'Earn from pujas and consultations',
    icon: 'person',
    href: '/(onboard)/become-priest',
  },
  {
    id: 'astrologer',
    label: 'Become an astrologer',
    subtitle: 'Per-minute jyotish consultations',
    icon: 'star',
    href: '/(onboard)/become-astrologer',
  },
  {
    id: 'wellness',
    label: 'Teach yoga & meditation',
    subtitle: 'Live group sessions, fair payouts',
    icon: 'leaf',
    href: '/(onboard)/become-wellness',
  },
  {
    id: 'gaushala',
    label: 'List your gaushala',
    subtitle: `${HAS_80G ? '80G donations' : 'Donations'}, monthly seva subs`,
    icon: 'paw',
    href: '/(onboard)/list-gaushala',
  },
  {
    id: 'gurukul',
    label: 'Register your gurukul',
    subtitle: 'Admission inquiries from India + diaspora',
    icon: 'school',
    href: '/(onboard)/become-gurukul',
  },
  {
    id: 'gurukul-portal',
    label: 'Gurukul portal',
    subtitle: 'Manage listings + admission applications',
    icon: 'briefcase',
    href: '/(devotee)/gurukul-portal',
  },
];

/**
 * `onPress` is REQUIRED. It used to be optional, with an apologetic
 * `Alert.alert(link.label, …)`
 * as the default, which meant every future row shipped inert unless somebody
 * remembered to wire it. Making the prop required moves that from a discipline
 * problem to a compile error.
 */
function LinkRow({ link, onPress }: { link: QuickLink; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.linkRow} activeOpacity={0.6} onPress={onPress}>
      <View style={[styles.linkIcon, { backgroundColor: `${link.color}14` }]}>
        <Ionicons name={link.icon} size={20} color={link.color} />
      </View>
      <View style={styles.linkInfo}>
        <Text style={styles.linkLabel}>{link.label}</Text>
        <Text style={styles.linkSubtitle}>{link.subtitle}</Text>
      </View>
      {link.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{link.badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
    </TouchableOpacity>
  );
}

function getInitials(name?: string | null): string {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'D';
}

export default function ProfileScreen() {
  const { user, isAuthenticated, signOut, refreshUser } = useAuth();
  const bookingsQuery = useBookings();
  const addressesQuery = useUserAddresses();
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboardOptions, setShowOnboardOptions] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // PAR-02: the envelopes are {success,bookings,pagination} and
  // {success,addresses}. Reading `.data` made both counters permanently 0.
  // The booking counter uses pagination.total, not the page length.
  const bookingCount = selectBookingTotal(bookingsQuery.data);
  const addressCount = selectAddresses(addressesQuery.data).length;
  const phone = user?.phone ?? '';
  const displayName = user?.fullName ?? 'Devotee';

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([bookingsQuery.refetch(), addressesQuery.refetch()]);
    setRefreshing(false);
  }

  function handleSignOut() {
    Alert.alert(SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  }

  function handleSignIn() {
    router.push('/(auth)/login' as any);
  }

  /*
   * EDIT PROFILE — wired, because the endpoint is real.
   *
   * `PATCH /api/v1/users/me` (apps/api/src/routes/users.ts:120) accepts
   * fullName, email, gotra, nakshatra, rashi, preferredLanguage, locationCity,
   * locationState, isNri and nriCountry, and returns the updated user. Only the
   * two fields this card already displays are edited here; the astrological and
   * NRI fields belong to a fuller form, and adding inputs for values this screen
   * never shows would be its own kind of invention.
   *
   * NOT `useUpdateProfile` from @poojly/api-client. That hook is typed with
   * `UpdateProfile` from @poojly/shared, whose field is `displayName` — the
   * route's own Zod schema has no such key and `z.object` STRIPS unknown ones,
   * so a rename sent through that hook is accepted with 200 and silently
   * discarded. Raw `api.patch` with the field names the route actually parses
   * is the same pattern app/(astrologer)/availability.tsx uses, and it cannot
   * quietly no-op.
   */
  function openEditProfile() {
    setEditForm({ fullName: user?.fullName ?? '', email: user?.email ?? '' });
    setEditOpen(true);
  }

  async function handleSaveProfile() {
    const fullName = editForm.fullName.trim();
    const email = editForm.email.trim();

    if (fullName.length < 1 || fullName.length > 100) {
      Alert.alert('Name required', 'Enter a name of 1 to 100 characters.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Check the email', 'Enter a valid email address, or clear the field.');
      return;
    }

    // Send only what changed. The route treats an explicit null as "clear this
    // field", so an untouched value must not be transmitted at all.
    const payload: { fullName?: string; email?: string | null } = {};
    if (fullName !== (user?.fullName ?? '')) payload.fullName = fullName;
    if (email !== (user?.email ?? '')) payload.email = email === '' ? null : email;

    if (Object.keys(payload).length === 0) {
      setEditOpen(false);
      return;
    }

    setSavingProfile(true);
    try {
      await api.patch('/api/v1/users/me', payload);
      // The card reads from the auth context, not from the response, so the
      // stored copy has to be re-fetched or the screen shows the old name.
      await refreshUser();
      setEditOpen(false);
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Please check your connection and try again.',
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleShare() {
    // Android ignores `url` and shares `message` alone, so the link lives in
    // the message text; iOS gets both and renders the URL as a rich preview.
    const url = WEB.origin;
    try {
      await Share.share(
        {
          title: 'Darshya',
          message: `Darshya — live darshan, puja bookings with video proof, and daily panchang from temples across India.\n\n${url}`,
          url,
        },
        { dialogTitle: 'Share Darshya', subject: 'Darshya' },
      );
    } catch (err) {
      // A dismissed sheet resolves, it does not reject — a rejection here is a
      // real failure to open the sheet at all, and saying so beats silence.
      Alert.alert(
        'Could not open the share sheet',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  function handleQuickLink(id: QuickLinkId) {
    switch (id) {
      case 'bookings':
        router.push('/(devotee)/bookings' as any);
        return;
      case 'messages':
        router.push('/(devotee)/messages' as any);
        return;
      case 'consultations':
        router.push('/(devotee)/consultations' as any);
        return;
      case 'subscription':
        /*
         * ROUTED, NOT HIDDEN — and this is a decision, not a default.
         *
         * `lib/nri-premium-availability.ts` has NRI_PREMIUM_IS_SELLABLE false,
         * so (devotee)/upgrade renders no purchase CTA. It is NOT a dead end:
         * for a devotee who already holds a plan it renders "You are already
         * Premium" plus where to manage it, and for everyone else it renders
         * NRI_PREMIUM_WITHDRAWN_NOTICE verbatim — that the plan was withdrawn,
         * that nothing was billed, and that existing subscriptions keep running
         * to their end date.
         *
         * Hiding the row would therefore strand exactly the people the notice
         * says still have a subscription, with no way to see its status from
         * inside the app. The subtitle carries the honesty instead: it reads
         * "Plan status — Premium is not on sale" while the gate is closed, and
         * flips back to "Manage your Darshya Premium" in the same change that
         * re-opens the sale.
         */
        router.push('/(devotee)/upgrade' as any);
        return;
      case 'addresses':
        // Was `Alert.alert('Addresses', '<n> saved addresses')` — a real count
        // read from the real endpoint, and nowhere to go with it. The devotee
        // could not read, add, correct or remove a single one, while
        // (devotee)/checkout.tsx refused to place a store order without a saved
        // address and told them to "Add one under Profile".
        router.push('/(devotee)/addresses' as any);
        return;
      case 'support':
        router.push('/(devotee)/support' as any);
        return;
      case 'settings':
        router.push('/(devotee)/settings' as any);
        return;
      case 'list-business':
        setShowOnboardOptions((v) => !v);
        return;
      case 'help':
        // The helper is the one place the destination is decided, and
        // app/(devotee)/support.tsx already calls it exactly like this.
        void openHelpCentre(Linking.openURL);
        return;
      case 'about':
        // Same-origin, so this frames in-app the moment react-native-webview is
        // installed and bounces to the browser until then. Either way it opens
        // the real page rather than describing one.
        openWebHandoff(ABOUT_TARGET, HANDOFF_OPTS, {
          push: (r) => router.push(r as never),
          openExternal: Linking.openURL,
        });
        return;
      case 'share':
        void handleShare();
        return;
      default: {
        // Exhaustiveness. A new QuickLinkId with no case above fails tsc here
        // rather than reaching a devotee as another apology.
        const unhandled: never = id;
        return unhandled;
      }
    }
  }

  const dynamicQuickLinks: QuickLink[] = quickLinks.map((l) => {
    if (l.id === 'bookings') {
      return { ...l, badge: bookingCount > 0 ? String(bookingCount) : undefined };
    }
    return l;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          {isAuthenticated ? (
            <>
              {/* Avatar with initials */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{displayName}</Text>
                {phone ? (
                  <View style={styles.userMeta}>
                    <Ionicons name="call-outline" size={13} color={colors.stone[400]} />
                    <Text style={styles.userPhone}>{phone}</Text>
                  </View>
                ) : null}
                {user?.email ? (
                  <View style={styles.userMeta}>
                    <Ionicons name="mail-outline" size={13} color={colors.stone[400]} />
                    <Text style={styles.userCity}>{user.email}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.editButton}
                activeOpacity={0.7}
                onPress={openEditProfile}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                accessibilityHint="Change your name and email address"
              >
                <Ionicons name="create-outline" size={18} color={colors.saffron[600]} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.signInContainer}>
              {/* Guest avatar */}
              <View style={[styles.avatar, styles.avatarGuest]}>
                <Ionicons name="person" size={32} color={colors.stone[400]} />
              </View>
              <Text style={styles.guestTitle}>Welcome, Devotee</Text>
              <Text style={styles.guestSubtitle}>
                Sign in to book pujas, watch live darshan, and track your spiritual journey.
              </Text>
              <TouchableOpacity style={styles.signInButton} activeOpacity={0.7} onPress={handleSignIn}>
                <Ionicons name="log-in-outline" size={20} color={colors.white} />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createAccount} activeOpacity={0.7} onPress={() => router.push('/(auth)/signup' as any)}>
                <Text style={styles.createAccountText}>
                  New user?{' '}
                  <Text style={styles.createAccountLink}>Create Account</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Stats (visible for logged in) */}
        {isAuthenticated && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bookingCount}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{addressCount}</Text>
              <Text style={styles.statLabel}>Addresses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.role === 'devotee' ? 'Devotee' : (user?.role ?? '—')}</Text>
              <Text style={styles.statLabel}>Role</Text>
            </View>
          </View>
        )}

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.linksCard}>
            {dynamicQuickLinks.map((link, index) => (
              <React.Fragment key={link.id}>
                <LinkRow link={link} onPress={() => handleQuickLink(link.id)} />
                {index < dynamicQuickLinks.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* More */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          <View style={styles.linksCard}>
            {moreLinks.map((link, index) => (
              <React.Fragment key={link.id}>
                <LinkRow link={link} onPress={() => handleQuickLink(link.id)} />
                {index < moreLinks.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Onboarding options (expanded when "List your business" tapped) */}
        {showOnboardOptions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose your role</Text>
            <View style={styles.linksCard}>
              {ONBOARD_OPTIONS.map((opt, index) => (
                <React.Fragment key={opt.id}>
                  <TouchableOpacity
                    style={styles.linkRow}
                    activeOpacity={0.6}
                    onPress={() => router.push(opt.href as any)}
                  >
                    <View
                      style={[
                        styles.linkIcon,
                        { backgroundColor: `${colors.saffron[600]}14` },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={colors.saffron[600]}
                      />
                    </View>
                    <View style={styles.linkInfo}>
                      <Text style={styles.linkLabel}>{opt.label}</Text>
                      <Text style={styles.linkSubtitle}>{opt.subtitle}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.stone[300]}
                    />
                  </TouchableOpacity>
                  {index < ONBOARD_OPTIONS.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Sign Out (if authenticated) */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.signOutButton} activeOpacity={0.7} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.red[600]} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>{'Darshya \u0950'}</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
          <Text style={styles.footerCopyright}>
            Made with devotion in India
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setEditOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.stone[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              style={styles.input}
              value={editForm.fullName}
              onChangeText={(fullName) => setEditForm((f) => ({ ...f, fullName }))}
              placeholder="Your name"
              placeholderTextColor={colors.stone[300]}
              autoCapitalize="words"
              maxLength={100}
              editable={!savingProfile}
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={editForm.email}
              onChangeText={(email) => setEditForm((f) => ({ ...f, email }))}
              placeholder="you@example.com"
              placeholderTextColor={colors.stone[300]}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!savingProfile}
            />
            <Text style={styles.fieldHint}>
              Your phone number is your sign-in identity and cannot be changed here.
            </Text>

            <TouchableOpacity
              style={[styles.saveBtn, savingProfile && styles.saveBtnBusy]}
              activeOpacity={0.8}
              onPress={() => void handleSaveProfile()}
              disabled={savingProfile}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
            >
              {savingProfile ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.md,
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
  // User Card
  userCard: {
    margin: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.stone[100],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.saffron[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.saffron[700],
  },
  avatarGuest: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.stone[100],
    marginRight: 0,
    marginBottom: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.xs,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
  },
  userCity: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.saffron[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sign In (Guest)
  signInContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  guestTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.xs,
  },
  guestSubtitle: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.saffron[600],
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    shadowColor: colors.saffron[700],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  signInButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  createAccount: {
    marginTop: spacing.sm,
  },
  createAccountText: {
    fontSize: fontSize.base,
    color: colors.stone[500],
  },
  createAccountLink: {
    color: colors.saffron[600],
    fontWeight: '600',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.saffron[600],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.stone[200],
  },
  // Sections
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[700],
    marginBottom: spacing.sm,
  },
  linksCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: {
    flex: 1,
  },
  linkLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[900],
    marginBottom: 1,
  },
  linkSubtitle: {
    fontSize: fontSize.sm,
    color: colors.stone[400],
  },
  badge: {
    backgroundColor: colors.saffron[600],
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.stone[100],
    marginLeft: 64,
  },
  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.red[500],
    gap: spacing.sm,
  },
  signOutText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.red[600],
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  footerLogo: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.saffron[600],
  },
  footerVersion: {
    fontSize: fontSize.sm,
    color: colors.stone[400],
  },
  footerCopyright: {
    fontSize: fontSize.xs,
    color: colors.stone[300],
  },
  // Edit Profile
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.stone[900],
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[600],
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.base,
    color: colors.stone[900],
    backgroundColor: colors.stone[50],
    marginBottom: spacing.md,
  },
  fieldHint: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    marginBottom: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnBusy: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
