import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAdminPendingApprovals } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { selectPendingApprovals, selectPendingApprovalsTotal } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { userRoleLabel } from '../../lib/enum-labels';

/**
 * TWO DEFECTS LIVED ON THIS SCREEN, AND THE SECOND ONE WAS THE DANGEROUS ONE.
 *
 * 1. IT READ KEYS THE ENDPOINT HAS NEVER RETURNED.
 *    `GET /api/v1/admin/pending-approvals` answers rows shaped
 *    `{ id, userId, role, profileName, city, createdAt }` — see
 *    `adminService.getPendingApprovals()`, and the verbatim comment in
 *    apps/web/app/admin/approvals/page.tsx. This screen rendered
 *    `u.fullName`, `u.email ?? u.phone` and `u.status`, none of which exist,
 *    so every pending provider showed as a blank name over a blank line with a
 *    hardcoded "Pending" badge. `useAdminPendingApprovals` declares the rows as
 *    `AdminUser[]` — a fabricated interface — so the compiler agreed. Reading
 *    goes through `selectPendingApprovals` now, which is written against the
 *    handler.
 *
 * 2. APPROVE AND REJECT WERE INERT, AND SAID THEY HAD WORKED.
 *    Both buttons added the row id to a local `Set` and popped an alert
 *    reading "<name> approved." No request was ever made. The provider stayed
 *    unapproved, invisible to devotees, unpaid — and the operator was told the
 *    opposite and moved on. This is the same class as the API's own AO-16
 *    stubs ("a stub that says deleted is more dangerous than one that 404s")
 *    and AO-01's ban button, both of which were fixed server-side while this
 *    client kept fabricating the confirmation.
 *
 *    The write that actually approves somebody is
 *    `PATCH /api/v1/admin/users/:userId { approved }` — admin-gated,
 *    transactional, and it sends the approval/rejection email. It is keyed on
 *    the USER id; the row's `id` is the provider PROFILE id and PATCHing it
 *    answers 404. That distinction is why `selectPendingApprovals` surfaces
 *    both and why a row with no `userId` is refused rather than guessed at.
 */
export default function AdminApprovals() {
  const approvalsQuery = useAdminPendingApprovals();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = selectPendingApprovals(approvalsQuery.data);
  const total = selectPendingApprovalsTotal(approvalsQuery.data, rows.length);

  const decision = useMutation<unknown, Error, { userId: string; approved: boolean }>({
    mutationFn: (vars) =>
      api.patch<unknown>(`/api/v1/admin/users/${encodeURIComponent(vars.userId)}`, {
        approved: vars.approved,
      }),
    // Refetch rather than splice locally: the server decides who is still
    // pending, and a row removed optimistically after a failed write is
    // exactly the lie this screen used to tell.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  async function onRefresh() {
    setRefreshing(true);
    await approvalsQuery.refetch();
    setRefreshing(false);
  }

  function decide(row: { id: string; userId: string; profileName: string }, approve: boolean) {
    if (!row.userId) {
      Alert.alert(
        'Cannot action this row',
        'The server did not send a user id for this application, so there is nothing safe to update. Use the web admin console.',
      );
      return;
    }

    Alert.alert(
      approve ? 'Approve provider?' : 'Reject provider?',
      approve
        ? `${row.profileName} will go live and be emailed. Continue?`
        : `${row.profileName} will be rejected and emailed. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setBusyId(row.id);
            try {
              await decision.mutateAsync({ userId: row.userId, approved: approve });
              Alert.alert(
                approve ? 'Approved' : 'Rejected',
                `${row.profileName} was ${approve ? 'approved' : 'rejected'}.`,
              );
            } catch (err) {
              // Never report success on failure — the whole point of this fix.
              Alert.alert(
                approve ? 'Approve failed' : 'Reject failed',
                `${err instanceof Error ? err.message : 'Unknown error'}\n\nNothing was changed.`,
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }

  const errorText = approvalsQuery.isError
    ? approvalsQuery.error instanceof Error
      ? approvalsQuery.error.message
      : 'Unknown error'
    : null;

  return (
    <PortalScreen
      title="Approvals"
      subtitle={
        approvalsQuery.isLoading
          ? 'Loading…'
          : approvalsQuery.isError
            ? 'Unavailable'
            : `${total} pending`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {errorText ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load approvals: {errorText}</Text>
          <Text style={styles.errorHint}>Pull down to retry.</Text>
        </View>
      ) : null}

      <Section title="Pending Provider Verifications">
        {approvalsQuery.isLoading ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : rows.length === 0 ? (
          <EmptyHint
            text={
              approvalsQuery.isError
                ? 'Could not load the approval queue.'
                : 'All caught up — no pending approvals.'
            }
          />
        ) : (
          rows.map((u) => {
            const busy = busyId === u.id;
            return (
              <View key={u.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{u.profileName}</Text>
                  <Text style={styles.meta}>
                    {userRoleLabel(u.role)}
                    {u.city ? ` • ${u.city}` : ''}
                  </Text>
                  {u.createdAt ? (
                    <Text style={styles.dateText}>
                      Applied {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  {busy ? (
                    <ActivityIndicator color={colors.stone[500]} />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.green[600] }]}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Approve ${u.profileName}`}
                        disabled={busyId !== null}
                        onPress={() => decide(u, true)}
                      >
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.red[600] }]}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Reject ${u.profileName}`}
                        disabled={busyId !== null}
                        onPress={() => decide(u, false)}
                      >
                        <Ionicons name="close" size={14} color={colors.white} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
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
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  meta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  dateText: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.xs, minWidth: 80, justifyContent: 'flex-end' },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { textAlign: 'center', padding: spacing.lg, color: colors.stone[500] },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
  errorHint: { color: colors.red[600], fontSize: fontSize.xs, marginTop: 2 },
});
