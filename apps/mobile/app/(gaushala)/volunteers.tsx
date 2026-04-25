import React from 'react';
import { View } from 'react-native';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

interface Volunteer {
  id: string;
  name: string;
  role: string;
  shifts: number;
  nextShift: string;
}

const VOLUNTEERS: Volunteer[] = [
  { id: '1', name: 'Anjali S.', role: 'Feeding', shifts: 24, nextShift: 'Tomorrow 6:30 AM' },
  { id: '2', name: 'Ramesh K.', role: 'Cleaning', shifts: 18, nextShift: 'Today 4:00 PM' },
  { id: '3', name: 'Priya M.', role: 'Medical Asst.', shifts: 12, nextShift: 'Sat 9:00 AM' },
  { id: '4', name: 'Vikram B.', role: 'Feeding', shifts: 30, nextShift: 'Today 5:00 PM' },
  { id: '5', name: 'Meera D.', role: 'Adoption Outreach', shifts: 9, nextShift: 'Sun 11:00 AM' },
  { id: '6', name: 'Sanjay R.', role: 'Maintenance', shifts: 21, nextShift: 'Mon 7:00 AM' },
];

export default function Volunteers() {
  const total = VOLUNTEERS.length;
  const totalShifts = VOLUNTEERS.reduce((a, v) => a + v.shifts, 0);

  return (
    <PortalScreen title="Volunteers" subtitle="Roster and shifts">
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Active" value={total} hint="this month" accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Total Shifts" value={totalShifts} hint="this month" />
      </View>

      <Section title="Volunteer Roster">
        {VOLUNTEERS.map((v) => (
          <ListRow
            key={v.id}
            primary={`${v.name} • ${v.role}`}
            secondary={`Next: ${v.nextShift}`}
            trailing={`${v.shifts}`}
            trailingHint="shifts"
          />
        ))}
      </Section>
    </PortalScreen>
  );
}
