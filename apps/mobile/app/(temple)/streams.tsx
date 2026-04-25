import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDarshan } from '@poojly/api-client';
import { PortalScreen, ListRow, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

export default function TempleStreams() {
  const darshanQuery = useDarshan();
  const [refreshing, setRefreshing] = useState(false);

  const streams = (darshanQuery.data?.data ?? []) as any[];

  async function onRefresh() {
    setRefreshing(true);
    await darshanQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Darshan Streams"
      subtitle={`${streams.length} configured`}
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

      {streams.length === 0 ? (
        <EmptyHint text="No streams configured yet." />
      ) : (
        streams.map((s) => {
          const isLive = String(s.status).toLowerCase() === 'live';
          return (
            <ListRow
              key={s.id}
              primary={s.title ?? s.temple?.name ?? 'Stream'}
              secondary={`${s.temple?.deity ?? ''} • ${s.temple?.city ?? ''}`}
              trailing={isLive ? `${(s.viewerCount ?? 0).toLocaleString('en-IN')}` : undefined}
              trailingHint={isLive ? 'watching' : 'scheduled'}
              status={{
                label: isLive ? 'LIVE' : 'SCHEDULED',
                color: isLive ? colors.red[600] : colors.stone[500],
              }}
            />
          );
        })
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
