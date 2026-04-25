import React from 'react';
import { View } from 'react-native';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

interface Student {
  id: string;
  name: string;
  enrolledIn: string;
  attendance: number;
  joinedDate: string;
}

const STUDENTS: Student[] = [
  { id: '1', name: 'Anjali S.', enrolledIn: '21-Day Surya Namaskar', attendance: 18, joinedDate: '3 weeks ago' },
  { id: '2', name: 'Ramesh K.', enrolledIn: 'Pranayama Foundations', attendance: 12, joinedDate: '1 month ago' },
  { id: '3', name: 'Priya M.', enrolledIn: 'Ashtanga Primary', attendance: 24, joinedDate: '2 months ago' },
  { id: '4', name: 'Vikram B.', enrolledIn: 'Restorative Evening', attendance: 6, joinedDate: '1 week ago' },
  { id: '5', name: 'Meera D.', enrolledIn: 'Pranayama Foundations', attendance: 9, joinedDate: '2 weeks ago' },
];

export default function Students() {
  const total = STUDENTS.length;
  const totalAttendance = STUDENTS.reduce((a, s) => a + s.attendance, 0);

  return (
    <PortalScreen title="Students" subtitle="Roster and progress">
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Total" value={total} hint="enrolled" accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Sessions Attended" value={totalAttendance} hint="this month" />
      </View>

      <Section title="All Students">
        {STUDENTS.map((s) => (
          <ListRow
            key={s.id}
            primary={s.name}
            secondary={`${s.enrolledIn} • Joined ${s.joinedDate}`}
            trailing={`${s.attendance} sessions`}
          />
        ))}
      </Section>
    </PortalScreen>
  );
}
