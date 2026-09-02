import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAstrologers } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { MessagesEntry } from '../../lib/inbox';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
// PM-10/F062: the rate card is derived in lib/astrologer-rate-card.ts, which
// documents why there is exactly one rate and is covered by the node-only
// mobile test runner. This screen used to invent chat/voice/video tiers.
import {
  astrologerRateRows,
  RATE_MODE_NOTE,
} from '../../lib/astrologer-rate-card';
// AUTH-09: the confirmation used to ask "Are you sure?" without saying what
// it was sure about. POST /auth/logout defaults to scope 'global'.
import { SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE } from '../../lib/signout-copy';

// No fabricated fallback. This rendered 'Vedic, Numerology, Tarot, Vastu' to
// EVERY astrologer whose profile had none set — asserting four skills the
// person never claimed, on the screen they show clients. Same defect class as
// the RYT-500 certifications removed from (wellness)/profile.tsx.

export default function AstrologerProfile() {
  const { user, signOut } = useAuth();
  const astrologersQuery = useAstrologers();
  const [refreshing, setRefreshing] = useState(false);

  const me = astrologersQuery.data?.astrologers?.find(
    (a) => a.name === user?.fullName || (user?.email && (a as { email?: string }).email === user.email),
  );

  const specializations = me?.specializations ?? [];
  const rates = astrologerRateRows(me?.pricePerMinute);

  async function onRefresh() {
    setRefreshing(true);
    await astrologersQuery.refetch();
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
      subtitle="Your astrologer details"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="star" size={28} color={colors.saffron[700]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{me?.name ?? user?.fullName ?? 'Astrologer'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {me?.experienceYears ? (
            <Text style={styles.email}>{me.experienceYears} years experience</Text>
          ) : null}
          {me?.rating ? (
            <Text style={styles.email}>
              ⭐ {me.rating.toFixed(1)} ({me.ratingCount ?? 0} reviews)
            </Text>
          ) : null}
        </View>
      </View>

      <Section title="Messages">
        <MessagesEntry roleGroup="astrologer" />
      </Section>

      {me?.bio ? (
        <Section title="About">
          <View style={styles.bioCard}>
            <Text style={styles.bio}>{me.bio}</Text>
          </View>
        </Section>
      ) : null}

      <Section title="Your rate">
        {rates.map((r) => (
          <View key={r.label} style={styles.rateRow}>
            <Text style={styles.rateLabel}>{r.label}</Text>
            <Text style={styles.rateValue}>{r.value}</Text>
          </View>
        ))}
        {/* PM-10/F062: the same per-minute rate is billed for chat, voice and
            video — POST /consultation/book carries no mode at all. Saying so
            here is what stops the three-tier card from being reinvented. */}
        <EmptyHint text={RATE_MODE_NOTE} />
      </Section>

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
    backgroundColor: colors.saffron[100],
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
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  rateLabel: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[800] },
  rateValue: { fontSize: fontSize.base, fontWeight: '700', color: colors.saffron[700] },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[50],
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  tagText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.saffron[700] },
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
