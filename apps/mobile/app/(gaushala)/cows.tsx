import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCows } from '@poojly/api-client';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const FALLBACK = [
  { id: '1', name: 'Lakshmi', breed: 'Gir', age: 6, health: 'Healthy', adoptionStatus: 'Adopted' },
  { id: '2', name: 'Nandini', breed: 'Sahiwal', age: 4, health: 'Healthy', adoptionStatus: 'Available' },
  { id: '3', name: 'Kamadhenu', breed: 'Tharparkar', age: 8, health: 'Recovering', adoptionStatus: 'Available' },
  { id: '4', name: 'Surabhi', breed: 'Gir', age: 3, health: 'Healthy', adoptionStatus: 'Adopted' },
  { id: '5', name: 'Ganga', breed: 'Red Sindhi', age: 7, health: 'Senior care', adoptionStatus: 'Available' },
  { id: '6', name: 'Yamuna', breed: 'Gir', age: 5, health: 'Healthy', adoptionStatus: 'Adopted' },
];

export default function GaushalaCows() {
  const cowsQuery = useCows();
  const [refreshing, setRefreshing] = useState(false);

  const apiCows = cowsQuery.data?.cows ?? [];
  const cows = apiCows.length > 0 ? apiCows : FALLBACK;

  async function onRefresh() {
    setRefreshing(true);
    await cowsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Cow Registry"
      subtitle={`${cows.length} cows`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => Alert.alert('Register Cow', 'Cow registration coming soon.')}
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Register New Cow</Text>
      </TouchableOpacity>

      {cows.length === 0 ? (
        <EmptyHint text="No cows registered yet." />
      ) : (
        cows.map((c) => {
          const adopted = (c.adoptionStatus ?? '').toLowerCase().includes('adopt');
          return (
            <ListRow
              key={c.id}
              primary={c.name}
              secondary={`${c.breed ?? 'Unknown'} • ${c.age ?? '?'} yrs • ${c.health ?? 'No health data'}`}
              status={{
                label: c.adoptionStatus ?? 'Available',
                color: adopted ? colors.green[600] : colors.amber[600],
              }}
            />
          );
        })
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
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
