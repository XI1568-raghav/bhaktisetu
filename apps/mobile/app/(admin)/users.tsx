import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminUsers } from '@poojly/api-client';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { approvalStatusLabel, userRoleLabel } from '../../lib/enum-labels';

const ROLE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'devotee', label: 'Devotee' },
  { key: 'priest', label: 'Priest' },
  { key: 'astrologer', label: 'Astrologer' },
  { key: 'admin', label: 'Admin' },
];

export default function AdminUsers() {
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const usersQuery = useAdminUsers(
    role === 'all' ? { q: search } : { role, q: search },
  );
  const [refreshing, setRefreshing] = useState(false);

  const users = usersQuery.data?.users ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await usersQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Users"
      subtitle={`${usersQuery.data?.total ?? users.length} total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.stone[400]} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email, phone…"
          placeholderTextColor={colors.stone[400]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {ROLE_FILTERS.map((f) => {
          const active = role === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setRole(f.key)}
              activeOpacity={0.7}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {users.length === 0 ? (
        <EmptyHint text="No users match these filters." />
      ) : (
        users.map((u) => (
          <TouchableOpacity
            key={u.id}
            activeOpacity={0.7}
            onPress={() => Alert.alert(u.fullName, `Role: ${u.role}\n${u.email ?? u.phone}\nJoined ${new Date(u.createdAt).toLocaleDateString('en-IN')}`)}
          >
            <ListRow
              primary={u.fullName}
              secondary={`${userRoleLabel(u.role)} • ${u.email ?? u.phone}`}
              trailingHint={new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              status={
                u.status
                  ? {
                      label: approvalStatusLabel(u.status),
                      color: u.status.toLowerCase() === 'active' ? colors.green[600] : colors.amber[600],
                    }
                  : undefined
              }
            />
          </TouchableOpacity>
        ))
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
});
