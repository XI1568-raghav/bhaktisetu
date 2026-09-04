import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { selectTemplePortalStreams } from '../../lib/api-contracts';
import { useTemplePortalStreams } from '../../lib/portal-queries';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { streamStatusLabel } from '../../lib/enum-labels';

/**
 * PAR-09. This screen read `.data` off the PUBLIC /darshan/live envelope
 * ({streams,total,upcoming}), so it showed nothing even while the manager's own
 * temple was broadcasting — and had the key been right it would instead have
 * listed every other temple's stream as this temple's. It now reads the
 * role-gated GET /api/v1/temple-portal/darshan. (There is no
 * /temple-portal/streams route; that URL 404s.)
 */
export default function TempleStreams() {
  const streamsQuery = useTemplePortalStreams();
  const [refreshing, setRefreshing] = useState(false);

  const streams = selectTemplePortalStreams(streamsQuery.data);

  async function onRefresh() {
    setRefreshing(true);
    await streamsQuery.refetch();
    setRefreshing(false);
  }

  const subtitle = streamsQuery.isLoading
    ? 'Loading…'
    : streamsQuery.isError
      ? 'Unavailable'
      : `${streams.length} configured`;

  return (
    <PortalScreen
      title="Darshan Streams"
      subtitle={subtitle}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.notice}>
        <Ionicons name="information-circle" size={18} color={colors.saffron[700]} />
        <Text style={styles.noticeText}>
          Live streaming requires AWS IVS — controls are available on the web portal. Mobile shows
          stream metadata only.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => Alert.alert('Add Stream', 'Stream creation is available on the web portal.')}
      >
        <Ionicons name="videocam" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Schedule Stream (Web)</Text>
      </TouchableOpacity>

      {streamsQuery.isLoading ? (
        <EmptyHint text="Loading your streams…" />
      ) : streamsQuery.isError ? (
        <EmptyHint text="Could not load your streams. Pull down to retry." />
      ) : streams.length === 0 ? (
        <EmptyHint text="No streams configured for your temple yet." />
      ) : (
        streams.map((s) => (
          <ListRow
            key={s.id}
            primary={s.title}
            secondary={
              [s.cameraLocation, s.scheduledStart?.slice(0, 16).replace('T', ' ')]
                .filter(Boolean)
                .join(' • ') || undefined
            }
            trailing={s.isLive ? (s.viewerCount ?? 0).toLocaleString('en-IN') : undefined}
            trailingHint={s.isLive ? 'watching' : undefined}
            status={{
              label: s.isLive ? 'Live now' : streamStatusLabel(s.status),
              color: s.isLive ? colors.red[600] : colors.stone[500],
            }}
          />
        ))
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.saffron[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.saffron[200],
    marginBottom: spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.saffron[700],
    lineHeight: 18,
  },
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
