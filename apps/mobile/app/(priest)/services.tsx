import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { PortalScreen, Section } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface ServiceOffer {
  id: string;
  name: string;
  deity: string;
  basePrice: number;
  enabled: boolean;
}

const INITIAL: ServiceOffer[] = [
  { id: '1', name: 'Rudrabhishek', deity: 'Lord Shiva', basePrice: 1100, enabled: true },
  { id: '2', name: 'Satyanarayan Katha', deity: 'Lord Vishnu', basePrice: 2100, enabled: true },
  { id: '3', name: 'Ganesh Atharvashirsha', deity: 'Lord Ganesha', basePrice: 751, enabled: true },
  { id: '4', name: 'Navagraha Shanti', deity: 'Nine Planets', basePrice: 3100, enabled: false },
  { id: '5', name: 'Durga Saptashati Path', deity: 'Goddess Durga', basePrice: 1551, enabled: true },
  { id: '6', name: 'Sunderkand Path', deity: 'Lord Hanuman', basePrice: 551, enabled: false },
];

export default function PriestServices() {
  const [services, setServices] = useState<ServiceOffer[]>(INITIAL);

  function toggle(id: string) {
    setServices((s) => s.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)));
  }

  const enabledCount = services.filter((s) => s.enabled).length;

  return (
    <PortalScreen
      title="My Services"
      subtitle={`${enabledCount} of ${services.length} active`}
    >
      <Section title="Puja Offerings">
        {services.map((s) => (
          <View key={s.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.meta}>
                {s.deity} • ₹{s.basePrice.toLocaleString('en-IN')}
              </Text>
            </View>
            <Switch
              value={s.enabled}
              onValueChange={() => toggle(s.id)}
              trackColor={{ false: colors.stone[200], true: colors.saffron[400] }}
              thumbColor={s.enabled ? colors.saffron[600] : colors.stone[400]}
            />
          </View>
        ))}
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
