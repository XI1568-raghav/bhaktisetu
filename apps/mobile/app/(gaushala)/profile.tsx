import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section } from '../../lib/portal-screen';
import {
  selectGaushalaSelfProfile,
  useGaushalaPortalDashboard,
} from '../../lib/gaushala-portal-profile';
import { MessagesEntry } from '../../lib/inbox';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { HAS_80G } from '../../lib/eighty-g';
// AUTH-09: the confirmation used to ask "Are you sure?" without saying what
// it was sure about. POST /auth/logout defaults to scope 'global'.
import { SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE } from '../../lib/signout-copy';

/**
 * PAR-24. This screen used `useGaushalas()` = GET /api/v1/gaushala, the SAMPLE
 * listing feed whose own service header says "Nothing here has been verified",
 * and looked itself up in it by `g.name === user.fullName`. For a real manager
 * that never matched, so the query was dead weight; for an org-named account it
 * COULD match, and the screen would then print a fixture's unsourced
 * description ("Founded in 1993 by...") as this gaushala's own About text.
 * `cowCount` was not even a key that feed sends.
 *
 * It now reads the role-gated GET /api/v1/gaushala-portal/dashboard, which
 * returns this user's own GaushalaProfile row. See lib/gaushala-portal-profile.
 */
export default function GaushalaProfile() {
  const { user, signOut } = useAuth();
  const dashboardQuery = useGaushalaPortalDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const me = selectGaushalaSelfProfile(dashboardQuery.data);
  const unavailable = !dashboardQuery.isLoading && me === null;

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
          {me?.city ? <Text style={styles.email}>{me.city}</Text> : null}
          {me?.totalCows !== null && me?.totalCows !== undefined ? (
            <Text style={styles.email}>{me.totalCows} cows in care</Text>
          ) : null}
        </View>
      </View>

      {unavailable ? (
        <Text style={styles.notice}>
          Your gaushala profile could not be loaded. This is a server or
          permission error — pull down to retry.
        </Text>
      ) : null}

      {me?.profileMissing ? (
        <Text style={styles.notice}>
          You have not created a gaushala profile yet, so there is nothing to
          show here. Add your gaushala’s name on the Darshya web portal to create one.
        </Text>
      ) : null}

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
        {me && !me.profileMissing ? (
          <View style={styles.row}>
            <Ionicons
              name={me.approved ? 'checkmark-circle-outline' : 'time-outline'}
              size={18}
              color={me.approved ? colors.green[600] : colors.amber[600]}
            />
            {/* `approved` is the ONLY listing flag anything writes
                (gaushala-portal.ts, admin.service.ts, onboarding.service.ts).
                `GaushalaProfile.verified` has no writer anywhere in the API and
                is deliberately not rendered. */}
            <Text style={styles.rowText}>
              {me.approved
                ? 'Listing approved by a Darshya reviewer.'
                : 'Listing awaiting review by Darshya.'}
            </Text>
          </View>
        ) : null}
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
  notice: {
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[500],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.stone[700],
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  signOut: {
    marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14, backgroundColor: colors.white,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.red[500],
  },
  signOutText: { fontSize: fontSize.base, fontWeight: '700', color: colors.red[600] },
});
