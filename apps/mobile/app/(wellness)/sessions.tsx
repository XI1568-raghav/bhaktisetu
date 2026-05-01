import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useWellnessSessions,
  useCreateWellnessSession,
  useSetWellnessRoom,
} from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { useAuth } from '../../lib/auth-context';

interface WellnessSessionRow {
  id: string;
  title: string;
  description?: string;
  type?: string;
  duration?: number;
  level?: string;
  instructorId?: string;
  instructorName?: string;
  startTime?: string;
  roomUrl?: string | null;
}

export default function WellnessSessionsScreen() {
  const sessionsQuery = useWellnessSessions();
  const createSession = useCreateWellnessSession();
  const setRoom = useSetWellnessRoom();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'yoga',
    duration: '60',
    level: 'beginner',
    startTime: '',
  });

  const allSessions =
    (sessionsQuery.data?.sessions as WellnessSessionRow[] | undefined) ?? [];
  const mySessions = user?.id
    ? allSessions.filter((s) => !s.instructorId || s.instructorId === user.id)
    : allSessions;

  async function onRefresh() {
    setRefreshing(true);
    await sessionsQuery.refetch();
    setRefreshing(false);
  }

  function handleSetRoom(s: WellnessSessionRow) {
    Alert.prompt?.(
      'Set Room URL',
      `Jitsi/Zoom link for "${s.title}"`,
      async (input?: string) => {
        const roomUrl = (input ?? '').trim();
        if (!roomUrl) return;
        try {
          await setRoom.mutateAsync({ sessionId: s.id, roomUrl });
          Alert.alert('Saved', 'Room URL updated.');
        } catch (err) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
        }
      },
      'plain-text',
      s.roomUrl ?? ''
    );
    if (!Alert.prompt) {
      Alert.alert('Set Room URL', 'Use the desktop app or web portal to set room URLs.');
    }
  }

  async function handleCreate() {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Title is required.');
      return;
    }
    try {
      await createSession.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type.trim() || 'yoga',
        duration: Number(form.duration) || 60,
        level: form.level.trim() || 'beginner',
        startTime: form.startTime.trim() || new Date().toISOString(),
      });
      setCreateOpen(false);
      setForm({
        title: '',
        description: '',
        type: 'yoga',
        duration: '60',
        level: 'beginner',
        startTime: '',
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create session');
    }
  }

  return (
    <PortalScreen
      title="Sessions"
      subtitle={`${mySessions.length} of yours`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {sessionsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load sessions:{' '}
            {sessionsQuery.error instanceof Error ? sessionsQuery.error.message : 'Unknown error'}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() => setCreateOpen(true)}
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Schedule New Session</Text>
      </TouchableOpacity>

      <Section title="My Sessions">
        {sessionsQuery.isLoading ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : mySessions.length === 0 ? (
          <EmptyHint text="No sessions yet — schedule one to get started." />
        ) : (
          mySessions.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.cardPrimary}>{s.title}</Text>
              <Text style={styles.cardSecondary}>
                {(s.type ?? 'Yoga')} • {s.duration ?? 0} min
                {s.level ? ` • ${s.level}` : ''}
              </Text>
              {s.startTime ? (
                <Text style={styles.cardSecondary}>
                  {new Date(s.startTime).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              ) : null}
              {s.roomUrl ? (
                <Text style={styles.roomLink} numberOfLines={1}>
                  Room: {s.roomUrl}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={() => handleSetRoom(s)}
                  activeOpacity={0.8}
                  disabled={setRoom.isPending}
                >
                  <Text style={styles.actionPrimaryText}>
                    {s.roomUrl ? 'Update Room URL' : 'Set Room URL'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Section>

      <Modal
        visible={createOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>Schedule Session</Text>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
                placeholder="Morning Yoga"
              />
              <Text style={styles.label}>Type</Text>
              <TextInput
                style={styles.input}
                value={form.type}
                onChangeText={(t) => setForm({ ...form, type: t })}
                placeholder="yoga / meditation / pranayama"
              />
              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={form.duration}
                onChangeText={(t) => setForm({ ...form, duration: t })}
                keyboardType="number-pad"
              />
              <Text style={styles.label}>Level</Text>
              <TextInput
                style={styles.input}
                value={form.level}
                onChangeText={(t) => setForm({ ...form, level: t })}
                placeholder="beginner / intermediate / advanced"
              />
              <Text style={styles.label}>Start time (ISO)</Text>
              <TextInput
                style={styles.input}
                value={form.startTime}
                onChangeText={(t) => setForm({ ...form, startTime: t })}
                placeholder="2026-05-01T08:00:00.000Z"
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionGhost]}
                  onPress={() => setCreateOpen(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={handleCreate}
                  activeOpacity={0.8}
                  disabled={createSession.isPending}
                >
                  <Text style={styles.actionPrimaryText}>
                    {createSession.isPending ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.green[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  addButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  loading: { textAlign: 'center', padding: spacing.lg, color: colors.stone[500] },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  cardPrimary: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardSecondary: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  roomLink: { fontSize: fontSize.sm, color: colors.green[600], marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionPrimary: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  actionPrimaryText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  actionGhost: { backgroundColor: colors.white, borderColor: colors.stone[300] },
  actionGhostText: { color: colors.stone[700], fontSize: fontSize.sm, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.stone[900],
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[700],
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
    padding: 10,
    fontSize: fontSize.base,
    color: colors.stone[900],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
