import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePriestProfile } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { MessagesEntry } from '../../lib/inbox';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface PriestProfileShape {
  displayName?: string;
  bio?: string;
  languages?: string[];
  specializations?: string[];
  experienceYears?: number;
  avatarUrl?: string | null;
  rating?: number;
  ratingCount?: number;
  aadhaarVerified?: boolean;
  bankLinked?: boolean;
  gstStatus?: string;
}

export default function PriestProfile() {
  const { user, signOut } = useAuth();
  const profileQuery = usePriestProfile();
  const [refreshing, setRefreshing] = useState(false);

  const profile = (profileQuery.data?.profile as PriestProfileShape | undefined) ?? null;
  const aadhaarVerified = profile?.aadhaarVerified ?? false;
  const bankLinked = profile?.bankLinked ?? false;
  const gstStatus = profile?.gstStatus ?? 'pending';

  async function onRefresh() {
    setRefreshing(true);
    await profileQuery.refetch();
    setRefreshing(false);
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
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
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {user?.phone ? <Text style={styles.email}>{user.phone}</Text> : null}
          {profile?.experienceYears ? (
            <Text style={styles.email}>{profile.experienceYears} years experience</Text>
          ) : null}
        </View>
      </View>

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

      <Section title="Verification">
        <View style={styles.verifyRow}>
          <Ionicons
            name={aadhaarVerified ? 'shield-checkmark' : 'time-outline'}
            size={18}
            color={aadhaarVerified ? colors.green[600] : colors.amber[600]}
          />
          <Text style={styles.verifyText}>
            Aadhaar {aadhaarVerified ? 'Verified' : 'Pending'}
          </Text>
        </View>
        <View style={styles.verifyRow}>
          <Ionicons
            name={bankLinked ? 'shield-checkmark' : 'time-outline'}
            size={18}
            color={bankLinked ? colors.green[600] : colors.amber[600]}
          />
          <Text style={styles.verifyText}>
            Bank Account {bankLinked ? 'Linked' : 'Not linked'}
          </Text>
        </View>
        <View style={styles.verifyRow}>
          <Ionicons
            name={gstStatus === 'verified' ? 'shield-checkmark' : 'time-outline'}
            size={18}
            color={gstStatus === 'verified' ? colors.green[600] : colors.amber[600]}
          />
          <Text style={styles.verifyText}>
            GST {gstStatus === 'verified' ? 'Verified' : 'Pending Review'}
          </Text>
        </View>
      </Section>

      {profileQuery.isError && !profile ? (
        <EmptyHint text="Couldn't load profile right now. Pull to retry." />
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
