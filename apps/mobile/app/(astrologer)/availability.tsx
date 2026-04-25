import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { PortalScreen, Section } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Slot {
  day: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
}

const INITIAL: Slot[] = [
  { day: 'Mon', morning: true, afternoon: true, evening: false },
  { day: 'Tue', morning: true, afternoon: true, evening: true },
  { day: 'Wed', morning: false, afternoon: true, evening: true },
  { day: 'Thu', morning: true, afternoon: false, evening: true },
  { day: 'Fri', morning: true, afternoon: true, evening: true },
  { day: 'Sat', morning: false, afternoon: true, evening: false },
  { day: 'Sun', morning: false, afternoon: false, evening: false },
];

const SLOT_LABELS = [
  { key: 'morning', label: 'Morning', range: '06:00 – 12:00' },
  { key: 'afternoon', label: 'Afternoon', range: '12:00 – 18:00' },
  { key: 'evening', label: 'Evening', range: '18:00 – 22:00' },
] as const;

export default function Availability() {
  const [slots, setSlots] = useState<Slot[]>(INITIAL);

  function toggle(day: string, key: 'morning' | 'afternoon' | 'evening') {
    setSlots((s) => s.map((it) => (it.day === day ? { ...it, [key]: !it[key] } : it)));
  }

  return (
    <PortalScreen title="Availability" subtitle="Set your weekly schedule">
      <Section title="This Week">
        {slots.map((slot) => (
          <View key={slot.day} style={styles.dayCard}>
            <Text style={styles.dayLabel}>{slot.day}</Text>
            <View style={styles.slotsRow}>
              {SLOT_LABELS.map((s) => (
                <View key={s.key} style={styles.slotItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotName}>{s.label}</Text>
                    <Text style={styles.slotRange}>{s.range}</Text>
                  </View>
                  <Switch
                    value={slot[s.key]}
                    onValueChange={() => toggle(slot.day, s.key)}
                    trackColor={{ false: colors.stone[200], true: colors.saffron[400] }}
                    thumbColor={slot[s.key] ? colors.saffron[600] : colors.stone[400]}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  dayCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dayLabel: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.saffron[700],
    marginBottom: spacing.sm,
  },
  slotsRow: { gap: spacing.sm },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
  },
  slotName: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[800] },
  slotRange: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
});
