import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePriestProfile } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { MessagesEntry } from '../../lib/inbox';
import { selectPriestProfile } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
// AUTH-09: the confirmation used to ask "Are you sure?" without saying what
// it was sure about. POST /auth/logout defaults to scope 'global'.
import { SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE } from '../../lib/signout-copy';

/**
 * PAR-11. GET /api/v1/priest/profile returns the profile FLAT — there is no
 * `profile` wrapper — so `profileQuery.data?.profile` was undefined and this
 * screen rendered an empty shell for every pandit: no name, no bio, no
 * specializations, no rating, no temple.
 *
 * The Verification block was worse than empty. `aadhaarVerified ?? false`,
 * `bankLinked ?? false` and `gstStatus ?? 'pending'` ran against a payload
 * that has no bank or GST field at all, so every pandit — including verified
 * ones — was told "Bank Account Not linked" and "GST Pending Review". Those
 * two rows now say "not reported by this endpoint" instead of asserting a
 * compliance state the app cannot know.
 */
export default function PriestProfile() {
  const { user, signOut } = useAuth();
  const profileQuery = usePriestProfile();
  const [refreshing, setRefreshing] = useState(false);

  const profile = selectPriestProfile(profileQuery.data);

  async function onRefresh() {
    setRefreshing(true);
    await profileQuery.refetch();
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

  return (
    <PortalScreen
      title="Profile"
      subtitle="Your priest details"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={colors.saffron[700]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.displayName ?? user?.fullName ?? 'Pandit'}</Text>
          {profile?.email ?? user?.email ? (
            <Text style={styles.email}>{profile?.email ?? user?.email}</Text>
          ) : null}
          {profile?.phone ?? user?.phone ? (
            <Text style={styles.email}>{profile?.phone ?? user?.phone}</Text>
          ) : null}
          {profile?.experienceYears ? (
            <Text style={styles.email}>{profile.experienceYears} years experience</Text>
          ) : null}
          {profile?.rating !== null && profile?.rating !== undefined ? (
            <Text style={styles.email}>
              ★ {profile.rating.toFixed(2)} ({profile.ratingCount}{' '}
              {profile.ratingCount === 1 ? 'rating' : 'ratings'})
            </Text>
          ) : null}
        </View>
      </View>

      {profile && profile.temples.length > 0 ? (
        <Section title="Temples">
          <View style={styles.chipWrap}>
            {profile.temples.map((t) => (
              <View key={t.id} style={styles.chip}>
                <Text style={styles.chipText}>
                  {t.name}
                  {t.city ? ` · ${t.city}` : ''}
                  {t.isPrimary ? ' · primary' : ''}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {profile?.bio ? (
        <Section title="About">
          <View style={styles.bioCard}>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        </Section>
      ) : null}

      {profile?.specializations && profile.specializations.length > 0 ? (
        <Section title="Specializations">
          <View style={styles.chipWrap}>
            {profile.specializations.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {profile?.languages && profile.languages.length > 0 ? (
        <Section title="Languages">
          <View style={styles.chipWrap}>
            {profile.languages.map((l) => (
              <View key={l} style={[styles.chip, styles.chipMuted]}>
                <Text style={styles.chipText}>{l}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Messages">
        <MessagesEntry roleGroup="priest" />
      </Section>

      {profile ? (
        <Section title="Verification">
          <View style={styles.verifyRow}>
            <Ionicons
              name={profile.aadhaarVerified ? 'shield-checkmark' : 'time-outline'}
              size={18}
              color={profile.aadhaarVerified ? colors.green[600] : colors.amber[600]}
            />
            <Text style={styles.verifyText}>
              Aadhaar {profile.aadhaarVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
          <View style={styles.verifyRow}>
            <Ionicons
              name={profile.isVerified ? 'shield-checkmark' : 'time-outline'}
              size={18}
              color={profile.isVerified ? colors.green[600] : colors.amber[600]}
            />
            <Text style={styles.verifyText}>
              Listing {profile.verificationStatus ?? (profile.isVerified ? 'approved' : 'pending')}
            </Text>
          </View>
          {/* Bank and GST are NOT on this endpoint. Saying "Not linked" for a
              pandit whose bank details are on file would be a false statement
              about their payout eligibility. */}
          <Text style={styles.verifyNote}>
            Bank account and GST status are not reported by the app. Check them
            in the web portal.
          </Text>
        </Section>
      ) : null}

      {!profile ? (
        <EmptyHint
          text={
            profileQuery.isLoading
              ? 'Loading your profile…'
              : "Couldn't load your profile right now. Pull down to retry."
          }
        />
      ) : null}

      <TouchableOpacity style={styles.signOut} activeOpacity={0.7} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.red[600]} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[900] },
  email: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  bioCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  bio: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[100],
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  chipMuted: {
    backgroundColor: colors.stone[100],
    borderColor: colors.stone[200],
  },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.stone[700] },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  verifyText: { fontSize: fontSize.base, color: colors.stone[800], fontWeight: '600' },
  verifyNote: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  signOut: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.red[500],
  },
  signOutText: { fontSize: fontSize.base, fontWeight: '700', color: colors.red[600] },
});
