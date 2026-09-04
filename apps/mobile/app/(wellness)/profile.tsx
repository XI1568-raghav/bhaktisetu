import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWellnessInstructors } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
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
 * Both are deleted. The certifications section is gone rather than emptied,
 * because an empty "Certifications" heading still implies the platform tracks
 * them. Specializations now show only what the API actually returned, and
 * `EmptyHint` says so when it returned nothing.
 */

export default function WellnessProfile() {
  const { user, signOut } = useAuth();
  const instructorsQuery = useWellnessInstructors();
  const [refreshing, setRefreshing] = useState(false);

  const me = instructorsQuery.data?.instructors?.find(
    (i) => i.name === user?.fullName,
  );

  const specializations = me?.specializations ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await instructorsQuery.refetch();
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
          <Text style={styles.name}>{me?.name ?? user?.fullName ?? 'Instructor'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {me?.rating ? (
            <Text style={styles.email}>
              ⭐ {me.rating.toFixed(1)} ({me.ratingCount ?? 0} reviews)
            </Text>
          ) : null}
          {me?.hourlyRate ? (
            <Text style={styles.email}>₹{me.hourlyRate.toLocaleString('en-IN')} / hour</Text>
          ) : null}
        </View>
      </View>

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

      {/* The "Certifications" section stood here. See the note at the top of
          this file — it published two credentials the platform has never held,
          for every instructor, unconditionally. */}

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
});
