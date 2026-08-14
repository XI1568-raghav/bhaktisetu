import React, { useState } from 'react';
import { View } from 'react-native';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { selectPortalCows } from '../../lib/api-contracts';
import { useGaushalaPortalCows } from '../../lib/portal-queries';
import { colors, spacing } from '../../lib/theme';

/**
 * PAR-12. This dashboard counted the PUBLIC cow feed — 19 animals across five
 * gaushalas — and reported them as this manager's herd. It then did
 * `cows.length || 42` and `adopted || 18`, so an empty (or failed) response
 * printed a herd of 42 with 18 adoptions: numbers with no origin at all.
 * "Donations (Mo) ₹64,200" and "Volunteers 12" were plain string literals.
 *
 * The counts now come from the scoped registry and nothing else appears until
 * there is an endpoint behind it.
 */
export default function GaushalaDashboard() {
  const cowsQuery = useGaushalaPortalCows();
  const [refreshing, setRefreshing] = useState(false);

  const cows = selectPortalCows(cowsQuery.data);
  const healthy = cows.filter((c) => c.healthStatus === 'healthy').length;
  const needingCare = cows.length - healthy;

  async function onRefresh() {
    setRefreshing(true);
    await cowsQuery.refetch();
    setRefreshing(false);
  }

  const subtitle = cowsQuery.isLoading
    ? 'Loading…'
    : cowsQuery.isError
      ? 'Registry unavailable'
      : 'Your registered herd';

  return (
    <PortalScreen
      title="Gaushala Dashboard"
      subtitle={subtitle}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {cowsQuery.isError ? (
        <EmptyHint text="Could not load your registry. Pull down to retry — no counts are shown rather than guessed ones." />
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <StatCard label="Registered Cows" value={cows.length} accent={colors.saffron[700]} />
          <View style={{ width: spacing.sm }} />
          <StatCard
            label="Needing care"
            value={needingCare}
            hint={`${healthy} healthy`}
            accent={needingCare > 0 ? colors.amber[500] : colors.green[600]}
          />
        </View>
      )}

      <Section title="Recently Added Cows">
        {cowsQuery.isLoading ? (
          <EmptyHint text="Loading…" />
        ) : cows.length === 0 ? (
          <EmptyHint text="No cows registered yet." />
        ) : (
          cows.slice(0, 5).map((c) => (
            <ListRow
              key={c.id}
              primary={`${c.name}${c.tagNumber ? ` (${c.tagNumber})` : ''}`}
              secondary={[c.breed, c.ageYears !== null ? `${c.ageYears} yrs` : null]
                .filter(Boolean)
                .join(' • ')}
              status={
                c.healthStatus
                  ? {
                      label: c.healthStatus,
                      color:
                        c.healthStatus === 'healthy' ? colors.green[600] : colors.amber[600],
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
