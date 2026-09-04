import React, { useState } from 'react';
import { View } from 'react-native';
import { useGaushalaVolunteers } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';
import { userRoleLabel } from '../../lib/enum-labels';

function formatJoined(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export default function Volunteers() {
  const volunteersQuery = useGaushalaVolunteers();
  const [refreshing, setRefreshing] = useState(false);

  const volunteers = (volunteersQuery.data?.volunteers ?? []).filter((v) => v.active !== false);
  const total = volunteers.length;

  async function onRefresh() {
    setRefreshing(true);
    await volunteersQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Volunteers"
      subtitle={volunteersQuery.isLoading ? 'Loading…' : 'Active roster'}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Active" value={total} hint="volunteers" accent={colors.green[600]} />
      </View>

      <Section title="Volunteer Roster">
        {volunteersQuery.isLoading ? (
          <EmptyHint text="Loading volunteers…" />
        ) : volunteersQuery.isError ? (
          <EmptyHint text="Could not load volunteers. Pull to refresh." />
        ) : volunteers.length === 0 ? (
          <EmptyHint text="No volunteers signed up yet." />
        ) : (
          volunteers.map((v) => (
            <ListRow
              key={v.id}
              primary={[v.fullName, userRoleLabel(v.role)].filter(Boolean).join(' • ')}
              secondary={v.phone ?? 'No phone'}
              trailing={formatJoined(v.joinedAt)}
              trailingHint="joined"
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
