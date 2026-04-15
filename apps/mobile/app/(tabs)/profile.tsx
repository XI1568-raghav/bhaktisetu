import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

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
    id: 'subscription',
    icon: 'diamond',
    label: 'Subscription',
    subtitle: 'Manage your Bhaktisetu Premium',
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
    id: 'help',
    icon: 'help-circle',
    label: 'Help & Support',
    subtitle: 'FAQs and customer support',
    color: colors.stone[500],
  },
  {
    id: 'about',
    icon: 'information-circle',
    label: 'About Bhaktisetu',
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

function LinkRow({ link }: { link: QuickLink }) {
  return (
    <TouchableOpacity style={styles.linkRow} activeOpacity={0.6}>
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

export default function ProfileScreen() {
  const [isAuthenticated] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
                <Text style={styles.avatarText}>RK</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Rajesh Kumar</Text>
                <View style={styles.userMeta}>
                  <Ionicons
                    name="call-outline"
                    size={13}
                    color={colors.stone[400]}
                  />
                  <Text style={styles.userPhone}>+91 98765 43210</Text>
                </View>
                <View style={styles.userMeta}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={colors.stone[400]}
                  />
                  <Text style={styles.userCity}>Varanasi, UP</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
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
              <TouchableOpacity style={styles.signInButton} activeOpacity={0.7}>
                <Ionicons name="log-in-outline" size={20} color={colors.white} />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createAccount} activeOpacity={0.7}>
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
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Pujas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>45h</Text>
              <Text style={styles.statLabel}>Darshan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Temples</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>28</Text>
              <Text style={styles.statLabel}>Content</Text>
            </View>
          </View>
        )}

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.linksCard}>
            {quickLinks.map((link, index) => (
              <React.Fragment key={link.id}>
                <LinkRow link={link} />
                {index < quickLinks.length - 1 && (
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
                <LinkRow link={link} />
                {index < moreLinks.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Sign Out (if authenticated) */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.signOutButton} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={colors.red[600]} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>{'Bhaktisetu \u0950'}</Text>
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
