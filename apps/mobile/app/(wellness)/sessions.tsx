import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWellnessSessions } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

export default function WellnessSessionsScreen() {
  const sessionsQuery = useWellnessSessions();
  const [refreshing, setRefreshing] = useState(false);

  const sessions = sessionsQuery.data?.sessions ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await sessionsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Sessions"
      subtitle={`${sessions.length} scheduled`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => Alert.alert('Schedule Session', 'Session scheduling coming soon.')}
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Schedule New Session</Text>
      </TouchableOpacity>

      <Section title="All Sessions">
        {sessions.length === 0 ? (
          <EmptyHint text="No sessions yet — schedule one to get started." />
        ) : (
          sessions.map((s) => (
            <ListRow
              key={s.id}
              primary={s.title}
              secondary={`${s.type ?? 'Yoga'} • ${s.duration} min${s.level ? ` • ${s.level}` : ''}`}
              trailing={s.startTime ? new Date(s.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
              trailingHint={s.startTime ? new Date(s.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.green[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  addButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
});
