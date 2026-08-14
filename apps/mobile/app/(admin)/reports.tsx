import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminDashboard } from '@poojly/api-client';
import { PortalScreen, Section, StatCard } from '../../lib/portal-screen';
import { selectAdminDashboard, formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Report {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  format: 'CSV' | 'PDF' | 'Excel';
}

const REPORTS: Report[] = [
  { id: '1', title: 'Bookings Export', description: 'All puja bookings with status, amount, priest', icon: 'calendar', format: 'CSV' },
  { id: '2', title: 'Revenue & Commission', description: 'GMV, commission split, payouts per provider', icon: 'cash', format: 'Excel' },
  { id: '3', title: 'User Roster', description: 'All users with role, registration date, status', icon: 'people', format: 'CSV' },
  { id: '4', title: 'Provider Performance', description: 'Priests, astrologers, instructors KPIs', icon: 'trophy', format: 'PDF' },
  { id: '5', title: 'Refunds Ledger', description: 'All refund cases with reason and resolution', icon: 'return-down-back', format: 'CSV' },
  { id: '6', title: 'GST Statement', description: 'Tax-ready statement for the period', icon: 'document-text', format: 'PDF' },
];

export default function AdminReports() {
  const dashboardQuery = useAdminDashboard();
  const [refreshing, setRefreshing] = useState(false);

  // PAR-04: `dash.totalBookings.toLocaleString('en-IN')` crashed here exactly as
  // it did on the admin home — /api/v1/admin/dashboard returns no totalBookings.
  const dash = selectAdminDashboard(dashboardQuery.data);

  async function onRefresh() {
    setRefreshing(true);
    await dashboardQuery.refetch();
    setRefreshing(false);
  }

  // PAR-20 (adjacent, P1): Generate used to fire no request at all and then
  // tell the admin "Your report is being generated. You will receive an email
  // shortly." No export endpoint is wired to this screen, so that email never
  // arrives — a compliance hazard at tax time. Until the exports exist, say so.
  function exportReport(r: Report) {
    Alert.alert(
      r.title,
      `${r.format} export.\n\nReport exports are not available in the mobile app yet — this screen cannot generate or email a file. Use the web admin console.`,
      [{ text: 'OK' }],
    );
  }

  return (
    <PortalScreen
      title="Reports"
      subtitle="Exportable analytics"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {dash ? (
        <View style={{ flexDirection: 'row' }}>
          <StatCard
            label="Total Users"
            value={dash.totalUsers.toLocaleString('en-IN')}
            accent={colors.saffron[700]}
          />
          <View style={{ width: spacing.sm }} />
          <StatCard
            label="Total Revenue"
            value={formatInr(dash.totalRevenue)}
            accent={colors.green[600]}
          />
        </View>
      ) : null}

      <Text style={styles.notice}>
        Exports are not wired up in the app yet. The list below documents the
        reports the platform is meant to produce; generating them requires the
        web admin console.
      </Text>

      <Section title="Available Reports">
        {REPORTS.map((r) => (
          <TouchableOpacity
            key={r.id}
            activeOpacity={0.7}
            style={styles.card}
            onPress={() => exportReport(r)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={r.icon} size={20} color={colors.saffron[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{r.title}</Text>
              <Text style={styles.desc}>{r.description}</Text>
            </View>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{r.format}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  card: {
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
  iconContainer: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  desc: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  formatBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.stone[100],
  },
  formatText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.stone[700] },
  notice: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    backgroundColor: colors.amber[50],
    borderColor: colors.amber[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
});
