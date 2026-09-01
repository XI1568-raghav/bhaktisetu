import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBookings, useUserAddresses } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { selectAddresses, selectBookingTotal } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { HAS_80G } from '../../lib/eighty-g';
// AUTH-09: the confirmation used to ask "Are you sure?" without saying what
// it was sure about. POST /auth/logout defaults to scope 'global'.
import { SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE } from '../../lib/signout-copy';

interface QuickLink {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle: string;
  color: string;
  badge?: string;
}

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
    subtitle: 'Manage your Darshya Premium',
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
    subtitle: 'Language, notifications, privacy',
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
    id: 'help',
    icon: 'help-circle',
    label: 'Help & Support',
    subtitle: 'FAQs and customer support',
    color: colors.stone[500],
  },
  {
    id: 'about',
    icon: 'information-circle',
    label: 'About Darshya',
    subtitle: 'Our mission and story',
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

function LinkRow({ link, onPress }: { link: QuickLink; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.linkRow} activeOpacity={0.6} onPress={onPress ?? (() => Alert.alert(link.label, 'This feature is coming soon!'))}>
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
  const { user, isAuthenticated, signOut } = useAuth();
  const bookingsQuery = useBookings();
  const addressesQuery = useUserAddresses();
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboardOptions, setShowOnboardOptions] = useState(false);

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

  function handleQuickLink(id: string) {
    if (id === 'bookings') {
      router.push('/(devotee)/bookings' as any);
      return;
    }
    if (id === 'messages') {
      router.push('/(devotee)/messages' as any);
      return;
    }
    if (id === 'consultations') {
      router.push('/(devotee)/consultations' as any);
      return;
    }
    if (id === 'addresses') {
      Alert.alert('Addresses', `${addressCount} saved address${addressCount === 1 ? '' : 'es'}.`);
      return;
    }
    if (id === 'list-business') {
      setShowOnboardOptions((v) => !v);
      return;
    }
    Alert.alert('Coming Soon', 'This feature is coming soon!');
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
              <TouchableOpacity style={styles.editButton} activeOpacity={0.7} onPress={() => Alert.alert('Edit Profile', 'Profile editing coming soon!')}>
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
});
