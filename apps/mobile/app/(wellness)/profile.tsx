import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWellnessDashboard } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { selectProviderOwnProfile } from '../../lib/provider-profile';
import { MessagesEntry } from '../../lib/inbox';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
// AUTH-09: the confirmation used to ask "Are you sure?" without saying what
// it was sure about. POST /auth/logout defaults to scope 'global'.
import { SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE } from '../../lib/signout-copy';

/**
 * NO FABRICATED CREDENTIALS ON THIS SCREEN.
 *
 * This file used to carry two literals:
 *
 *   const FALLBACK_SPECIALIZATIONS = ['Hatha', 'Ashtanga', 'Pranayama', …];
 *   const FALLBACK_CERTS = ['RYT-500 Yoga Alliance',
 *                           'Vipassana Teacher Training (10-day)'];
 *
 * and rendered the certifications one UNCONDITIONALLY — every instructor who
 * signed up saw, and could screenshot, a profile stating they hold an RYT-500
 * from Yoga Alliance and a 10-day Vipassana teacher training. Neither is stored
 * anywhere: there is no certifications column, no upload, no verification step,
 * and no endpoint that returns one for the signed-in user. That is not a
 * placeholder, it is a qualification claim about a real person's fitness to
 * teach a physical practice, published by us on their behalf.
 *
 * Both are deleted. Specializations now show only what the API actually
 * returned, and `EmptyHint` says so when it returned nothing.
 *
 * CERTIFICATIONS ARE BACK — BUT ONLY REAL ONES. `WellnessProfile.certifications`
 * IS a column (prisma/schema.prisma:1123) and `PATCH /wellness-portal/profile`
 * writes it, so the platform does track them; what it has never done is invent
 * them. They are rendered here only when the instructor's own row carries them,
 * and the section does not exist at all when it does not.
 *
 * IDENTITY. This screen used to find "me" by scanning the PUBLIC instructor
 * directory for a row whose name equalled the signed-in user's — see
 * lib/provider-profile.ts. That directory lists APPROVED instructors only, so a
 * newly-signed-up instructor matched nothing and was told they had no
 * specializations on file when they did; and two instructors sharing a name
 * resolve to whichever row came back first. GET /wellness-portal/dashboard
 * returns the caller's OWN row, resolved server-side from the bearer token.
 */

export default function WellnessProfile() {
  const { user, signOut } = useAuth();
  const dashboardQuery = useWellnessDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const me = selectProviderOwnProfile(dashboardQuery.data, 'pricePerSession');

  const specializations = me?.specialties ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await dashboardQuery.refetch();
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
      subtitle="Your instructor details"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="leaf" size={28} color={colors.green[600]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{me?.displayName ?? user?.fullName ?? 'Instructor'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {me?.experienceYears ? (
            <Text style={styles.email}>{me.experienceYears} years experience</Text>
          ) : null}
          {/* No review COUNT is on this payload, so none is claimed. */}
          {me?.rating !== null && me?.rating !== undefined ? (
            <Text style={styles.email}>⭐ {me.rating.toFixed(1)}</Text>
          ) : null}
          {/* `pricePerSession`, the column. The old screen printed
              `me.hourlyRate` "/ hour" — the platform bills per SESSION and has
              no hourly rate anywhere, so that line was both undefined and,
              had it resolved, the wrong unit. */}
          {me?.priceInr ? (
            <Text style={styles.email}>
              ₹{me.priceInr.toLocaleString('en-IN')} / session
            </Text>
          ) : null}
        </View>
      </View>

      {me === null && !dashboardQuery.isLoading ? (
        <EmptyHint
          text={
            dashboardQuery.isError
              ? 'Your profile could not be loaded. Pull down to retry.'
              : 'You have no instructor profile yet. It is created the first time you save your details in the web portal.'
          }
        />
      ) : null}

      {me && !me.approved ? (
        <Text style={styles.pendingBanner}>
          {me.listingNote ?? 'Your portal is active. Add your price and details to be listed, so devotees can find and book your classes.'}
        </Text>
      ) : null}

      <Section title="Messages">
        <MessagesEntry roleGroup="wellness" />
      </Section>

      {me?.bio ? (
        <Section title="About">
          <View style={styles.bioCard}>
            <Text style={styles.bio}>{me.bio}</Text>
          </View>
        </Section>
      ) : null}

      {/* Real certifications only. The section is absent — not empty — when the
          instructor's row carries none, because an empty "Certifications"
          heading still implies a claim. See the note at the top of this file
          for the two credentials this screen used to publish unconditionally. */}
      {me && me.certifications.length > 0 ? (
        <Section title="Certifications">
          <View style={styles.tagRow}>
            {me.certifications.map((c) => (
              <View key={c} style={styles.tag}>
                <Text style={styles.tagText}>{c}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Specializations">
        {specializations.length === 0 ? (
          <EmptyHint text="No specializations on file." />
        ) : (
          <View style={styles.tagRow}>
            {specializations.map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

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
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
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
  row: {
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
  rowText: { fontSize: fontSize.base, color: colors.stone[800], fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: colors.green[500],
  },
  tagText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.green[600] },
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
  pendingBanner: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.stone[700],
    backgroundColor: colors.amber[50],
    borderColor: colors.amber[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
});
