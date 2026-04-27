import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGaushalas } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section } from '../../lib/portal-screen';
import { MessagesEntry } from '../../lib/inbox';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

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

      <Section title="Registration">
        <View style={styles.row}>
          <Ionicons name="shield-checkmark" size={18} color={colors.green[600]} />
          <Text style={styles.rowText}>80G Tax Exemption Certified</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="shield-checkmark" size={18} color={colors.green[600]} />
          <Text style={styles.rowText}>Animal Welfare Board Reg.</Text>
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
