import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const SPECIALIZATIONS = ['Vedic', 'Numerology', 'Tarot', 'Vastu'];

export default function AstrologerProfile() {
  const { user, signOut } = useAuth();

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
    <PortalScreen title="Profile" subtitle="Your astrologer details">
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="star" size={28} color={colors.saffron[700]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.fullName ?? 'Astrologer'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>
      </View>

      <Section title="Rates">
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Chat</Text>
          <Text style={styles.rateValue}>₹40 / min</Text>
        </View>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Voice Call</Text>
          <Text style={styles.rateValue}>₹60 / min</Text>
        </View>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Video Call</Text>
          <Text style={styles.rateValue}>₹100 / min</Text>
        </View>
      </Section>

      <Section title="Specializations">
        <View style={styles.tagRow}>
          {SPECIALIZATIONS.map((s) => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
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
