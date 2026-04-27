import React, { useState, useMemo } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { usePujas } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface ServiceOffer {
  id: string;
  name: string;
  deity: string;
  basePrice: number;
  enabled: boolean;
}

const FALLBACK: ServiceOffer[] = [
  { id: '1', name: 'Rudrabhishek', deity: 'Lord Shiva', basePrice: 1100, enabled: true },
  { id: '2', name: 'Satyanarayan Katha', deity: 'Lord Vishnu', basePrice: 2100, enabled: true },
  { id: '3', name: 'Ganesh Atharvashirsha', deity: 'Lord Ganesha', basePrice: 751, enabled: true },
  { id: '4', name: 'Navagraha Shanti', deity: 'Nine Planets', basePrice: 3100, enabled: false },
  { id: '5', name: 'Durga Saptashati Path', deity: 'Goddess Durga', basePrice: 1551, enabled: true },
  { id: '6', name: 'Sunderkand Path', deity: 'Lord Hanuman', basePrice: 551, enabled: false },
];

export default function PriestServices() {
  const pujasQuery = usePujas({ limit: 20 } as never);
  const [refreshing, setRefreshing] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const services = useMemo<ServiceOffer[]>(() => {
    const apiPujas = (pujasQuery.data as { data?: { id: string; name?: string; title?: string; deity?: string; basePrice?: number; basePriceInr?: number }[] } | undefined)?.data;
    if (apiPujas && apiPujas.length > 0) {
      return apiPujas.map((p, i) => ({
        id: p.id,
        name: p.name ?? p.title ?? `Puja ${i + 1}`,
        deity: p.deity ?? 'All deities',
        basePrice: p.basePrice ?? p.basePriceInr ?? 0,
        enabled: overrides[p.id] ?? true,
      }));
    }
    return FALLBACK.map((s) => ({ ...s, enabled: overrides[s.id] ?? s.enabled }));
  }, [pujasQuery.data, overrides]);

  function toggle(id: string) {
    setOverrides((prev) => {
      const current = services.find((s) => s.id === id)?.enabled ?? true;
      return { ...prev, [id]: !current };
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    await pujasQuery.refetch();
    setRefreshing(false);
  }

  const enabledCount = services.filter((s) => s.enabled).length;

  return (
    <PortalScreen
      title="My Services"
      subtitle={`${enabledCount} of ${services.length} active`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Section title="Puja Offerings">
        {services.length === 0 ? (
          <EmptyHint text="No puja types available yet." />
        ) : (
          services.map((s) => (
            <View key={s.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>
                  {s.deity}
                  {s.basePrice > 0 ? ` • ₹${s.basePrice.toLocaleString('en-IN')}` : ''}
                </Text>
              </View>
              <Switch
                value={s.enabled}
                onValueChange={() => toggle(s.id)}
                trackColor={{ false: colors.stone[200], true: colors.saffron[400] }}
                thumbColor={s.enabled ? colors.saffron[600] : colors.stone[400]}
              />
            </View>
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  meta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
});
