import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './auth-context';
import { colors, spacing, fontSize, borderRadius } from './theme';

/**
 * Phase 1 placeholder dashboard for the 7 provider portals. Phases 3-5 replace
 * each of these with full sub-page layouts, but the role guard + sign-out
 * already work at this level so we can verify routing end-to-end in Expo Go.
 */
export function PortalPlaceholder({
  title,
  subtitle,
  iconName,
  accentColor,
  upcomingFeatures,
}: {
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  upcomingFeatures: string[];
}) {
  const { user, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <View style={[styles.hero, { backgroundColor: accentColor }]}>
        <View style={styles.heroIcon}>
          <Ionicons name={iconName} size={32} color={colors.white} />
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
        {user ? (
          <Text style={styles.heroUser}>
            Welcome, <Text style={styles.heroUserBold}>{user.fullName}</Text>
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming in this portal</Text>
        {upcomingFeatures.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.saffron[500]}
            />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
        <Text style={styles.note}>
          You signed in successfully — the full portal screens land in the next
          phase. For now, you can confirm role-based routing works.
        </Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.red[600]} />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.stone[50] },
  scroll: { paddingBottom: spacing['2xl'] },
  hero: {
    paddingTop: 64,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.white,
  },
  heroSubtitle: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  heroUser: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.md,
  },
  heroUserBold: { fontWeight: '700', color: colors.white },
  section: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  featureText: { fontSize: fontSize.base, color: colors.stone[700] },
  note: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.red[500],
  },
  signOutText: {
    fontSize: fontSize.base,
    color: colors.red[600],
    fontWeight: '700',
  },
});
