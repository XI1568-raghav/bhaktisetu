import React, { useState } from 'react';
import { View } from 'react-native';
import { useWellnessStudents } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

function relDate(iso: string | undefined): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function Students() {
  const studentsQuery = useWellnessStudents();
  const [refreshing, setRefreshing] = useState(false);

  const students = studentsQuery.data?.students ?? [];
  const total = studentsQuery.data?.total ?? students.length;
  const totalSessions = students.reduce((a, s) => a + (s.sessionCount ?? 0), 0);

  async function onRefresh() {
    setRefreshing(true);
    await studentsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Students"
      subtitle="Paid enrollments roster"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Total" value={total} hint="students" accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Sessions Paid" value={totalSessions} hint="lifetime" />
      </View>

      <Section title="All Students">
        {studentsQuery.isLoading ? (
          <EmptyHint text="Loading students…" />
        ) : studentsQuery.isError ? (
          <EmptyHint text="Could not load students. Pull to refresh." />
        ) : students.length === 0 ? (
          <EmptyHint text="No paid enrollments yet." />
        ) : (
          students.map((s) => (
            <ListRow
              key={s.id}
              primary={s.fullName}
              secondary={`${s.lastSession?.title ?? 'Wellness'} • Enrolled ${relDate(s.lastEnrolledAt)}`}
              trailing={`${s.sessionCount}`}
              trailingHint="sessions"
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
