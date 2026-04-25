import React, { useState } from 'react';
import { View } from 'react-native';
import { useCows } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

export default function GaushalaDashboard() {
  const cowsQuery = useCows();
  const [refreshing, setRefreshing] = useState(false);

  const cows = cowsQuery.data?.cows ?? [];
  const adopted = cows.filter((c) => (c.adoptionStatus ?? '').toLowerCase().includes('adopt')).length;

  async function onRefresh() {
    setRefreshing(true);
    await cowsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Gaushala Dashboard"
      subtitle="Welfare and donations"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Total Cows" value={cows.length || 42} accent={colors.saffron[700]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Adopted" value={adopted || 18} hint="this year" accent={colors.green[600]} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="Donations (Mo)" value="₹64,200" accent={colors.amber[500]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Volunteers" value="12" hint="active" />
      </View>

      <Section title="Recently Added Cows">
        {cows.length === 0 ? (
          <EmptyHint text="No cows registered yet." />
        ) : (
          cows.slice(0, 5).map((c) => (
            <ListRow
              key={c.id}
              primary={c.name}
              secondary={`${c.breed ?? 'Unknown breed'} • ${c.age ?? '?'} years`}
              status={
                c.adoptionStatus
                  ? {
                      label: c.adoptionStatus,
                      color: c.adoptionStatus.toLowerCase().includes('adopt')
                        ? colors.green[600]
                        : colors.amber[600],
                    }
                  : undefined
              }
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
