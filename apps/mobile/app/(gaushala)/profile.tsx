import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGaushalas } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section } from '../../lib/portal-screen';
import { MessagesEntry } from '../../lib/inbox';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { HAS_80G } from '../../lib/eighty-g';
// AUTH-09: the confirmation used to ask "Are you sure?" without saying what
// it was sure about. POST /auth/logout defaults to scope 'global'.
import { SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE } from '../../lib/signout-copy';

export default function GaushalaProfile() {
  const { user, signOut } = useAuth();
  const gaushalasQuery = useGaushalas();
  const [refreshing, setRefreshing] = useState(false);

  const me = gaushalasQuery.data?.gaushalas?.find(
    (g) => g.name === user?.fullName || (user?.email && (g as { email?: string }).email === user.email),
  );

  async function onRefresh() {
    setRefreshing(true);
    await gaushalasQuery.refetch();
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
      subtitle="Gaushala details"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="paw" size={28} color="#92400E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{me?.name ?? user?.fullName ?? 'Manager'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {me?.location ? <Text style={styles.email}>{me.location}</Text> : null}
          {typeof me?.cowCount === 'number' ? (
            <Text style={styles.email}>{me.cowCount} cows in care</Text>
          ) : null}
        </View>
      </View>

      <Section title="Messages">
        <MessagesEntry roleGroup="gaushala" />
      </Section>

      {me?.description ? (
        <Section title="About">
          <View style={styles.bioCard}>
            <Text style={styles.bio}>{me.description}</Text>
          </View>
        </Section>
      ) : null}

      {/* TC-11 / TC-01 — this Section printed two green shield-checkmark rows,
          "80G Tax Exemption Certified" and "Animal Welfare Board Reg.", on
          EVERY gaushala's own profile. Neither was read from anything: no
          column, no endpoint, no props — two literals in this file, awarding a
          statutory tax registration and a Government of India board
          registration to whoever happened to be signed in. GaushalaProfile has
          no writer for `verified`, `gaushala_profiles.regn_80g` / `.pan` are
          SELECTed in one place and written nowhere, and no AWBI number is
          stored anywhere in the schema. The honest version states what the
          product actually knows — that a reviewer approved the listing — and
          says plainly that no registration has been checked. */}
      <Section title="Registration">
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={18} color={colors.stone[500]} />
          <Text style={styles.rowText}>
            Darshya has not verified any statutory registration for this gaushala.
            {HAS_80G ? '' : ' Donation receipts issued through Darshya are proof of payment and not 80G tax-exemption certificates.'}
          </Text>
        </View>
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100], gap: spacing.md,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[900] },
  email: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  bioCard: {
    backgroundColor: colors.white, padding: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.stone[100],
  },
  bio: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[100], marginBottom: spacing.sm,
  },
  rowText: { fontSize: fontSize.base, color: colors.stone[800], fontWeight: '600' },
  signOut: {
    marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14, backgroundColor: colors.white,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.red[500],
  },
  signOutText: { fontSize: fontSize.base, fontWeight: '700', color: colors.red[600] },
});
