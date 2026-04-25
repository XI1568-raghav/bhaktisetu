import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePujas } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface OfferingState {
  enabled: boolean;
  priestAssigned: boolean;
}

export default function TemplePujas() {
  const pujasQuery = usePujas();
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<Record<string, OfferingState>>({});

  const pujas = pujasQuery.data?.data ?? [];

  function toggleEnabled(id: string) {
    setState((s) => ({
      ...s,
      [id]: { enabled: !(s[id]?.enabled ?? true), priestAssigned: s[id]?.priestAssigned ?? true },
    }));
  }

  async function onRefresh() {
    setRefreshing(true);
    await pujasQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Puja Offerings"
      subtitle={`${pujas.length} configured`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => Alert.alert('Add Puja', 'Use the web portal to add a new puja type.')}
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Add Puja Type (Web)</Text>
      </TouchableOpacity>

      <Section title="Active Offerings">
        {pujas.length === 0 ? (
          <EmptyHint text="No pujas configured yet." />
        ) : (
          pujas.map((p) => {
            const enabled = state[p.id]?.enabled ?? true;
            return (
              <View key={p.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{p.name}</Text>
                  <Text style={styles.meta}>
                    {p.deity} • {p.durationMinutes ?? 120} min
                  </Text>
                  <View style={styles.statusRow}>
                    <Ionicons name="person" size={12} color={colors.green[600]} />
                    <Text style={styles.statusText}>Priest assigned</Text>
                  </View>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleEnabled(p.id)}
                  trackColor={{ false: colors.stone[200], true: colors.saffron[400] }}
                  thumbColor={enabled ? colors.saffron[600] : colors.stone[400]}
                />
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
  title: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  meta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  statusText: { fontSize: fontSize.xs, color: colors.green[600], fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.saffron[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  addButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
});
