import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { useAdminUserList } from '../../lib/portal-queries';
import { selectAdminUsers, selectTotal } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { userRoleLabel } from '../../lib/enum-labels';

/**
 * THREE CONTRACT DEFECTS, ALL OF THEM SILENT.
 *
 * 1. THE SEARCH BOX DID NOTHING. This screen called `useAdminUsers({ q })`;
 *    `GET /api/v1/admin/users` parses `userQuerySchema = { role, status,
 *    search, page, limit }`. There is no `q`, and zod strips unknown keys, so
 *    every keystroke re-fetched the same unfiltered page and it looked like a
 *    result. It sends `search` now — see `useAdminUserList`.
 *
 * 2. EVERY ROLE CHIP RETURNED AN EMPTY LIST. `adminService.getUsers` matches
 *    the Prisma `MarketplaceRole` enum and answers an empty page for an
 *    unrecognised value. The chips sent `devotee|priest|astrologer|admin`; the
 *    enum is `DEVOTEE|PANDIT|ASTROLOGER|ADMIN`. Only "All" ever worked, and the
 *    failure rendered as the honest-looking "No users match these filters."
 *
 * 3. IT COULD NOT SHOW A BLOCKED ACCOUNT. Rows come back as
 *    `{ id, fullName, email, phone, roles[], subscriptionTier, blocked,
 *      blockedAt, blockedReason, createdAt }`. This screen read `u.role`
 *    (singular — absent, so every row was labelled with an empty string) and
 *    `u.status` (absent, so the badge never rendered). AO-01 added `blocked`
 *    to this response specifically so a client would stop displaying its own
 *    optimistic guess about moderation state; this list never started reading
 *    it, so a banned pandit was indistinguishable from an active one.
 *
 * Reading now goes through `selectAdminUsers`, written against the handler.
 */

// Prisma `MarketplaceRole` values, verbatim — the only strings the route's
// role filter recognises.
const ROLE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'DEVOTEE', label: 'Devotee' },
  { key: 'PANDIT', label: 'Pandit' },
  { key: 'ASTROLOGER', label: 'Astrologer' },
  { key: 'TEMPLE_MANAGER', label: 'Temple' },
  { key: 'STORE_OWNER', label: 'Store' },
  { key: 'WELLNESS_INSTRUCTOR', label: 'Wellness' },
  { key: 'GAUSHALA_MANAGER', label: 'Gaushala' },
  { key: 'ADMIN', label: 'Admin' },
];

export default function AdminUsers() {
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const usersQuery = useAdminUserList({ role: role || undefined, search });

  const users = selectAdminUsers(usersQuery.data);
  const total = selectTotal(usersQuery.data, users.length);

  async function onRefresh() {
    setRefreshing(true);
    await usersQuery.refetch();
    setRefreshing(false);
  }

  const errorText = usersQuery.isError
    ? usersQuery.error instanceof Error
      ? usersQuery.error.message
      : 'Unknown error'
    : null;

  return (
    <PortalScreen
      title="Users"
      subtitle={
        usersQuery.isLoading
          ? 'Loading…'
          : usersQuery.isError
            ? 'Unavailable'
            : `${total} total`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.stone[400]} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Search name, email, phone…"
          placeholderTextColor={colors.stone[400]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {ROLE_FILTERS.map((f) => {
          const active = role === f.key;
          return (
            <TouchableOpacity
              key={f.key || 'all'}
              onPress={() => setRole(f.key)}
              activeOpacity={0.7}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {errorText ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load users: {errorText}</Text>
          <Text style={styles.errorHint}>Pull down to retry.</Text>
        </View>
      ) : null}

      {usersQuery.isLoading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : users.length === 0 ? (
        <EmptyHint
          text={
            usersQuery.isError
              ? 'Could not load the user list.'
              : 'No users match these filters.'
          }
        />
      ) : (
        users.map((u) => {
          const contact = u.email ?? u.phone ?? 'No contact on file';
          return (
            <TouchableOpacity
              key={u.id}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(
                  u.fullName,
                  [
                    `Roles: ${u.roles.map((r) => userRoleLabel(r)).join(', ') || '—'}`,
                    contact,
                    u.createdAt
                      ? `Joined ${new Date(u.createdAt).toLocaleDateString('en-IN')}`
                      : null,
                    u.blocked ? `Blocked${u.blockedReason ? `: ${u.blockedReason}` : ''}` : null,
                  ]
                    .filter(Boolean)
                    .join('\n'),
                )
              }
            >
              <ListRow
                primary={u.fullName}
                secondary={`${userRoleLabel(u.primaryRole)} • ${contact}`}
                trailingHint={
                  u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : undefined
                }
                status={
                  u.blocked
                    ? { label: 'Blocked', color: colors.red[600] }
                    : { label: 'Active', color: colors.green[600] }
                }
              />
            </TouchableOpacity>
          );
        })
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[200],
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.stone[800],
    padding: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[600] },
  chipTextActive: { color: colors.white },
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
