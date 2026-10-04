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
import { useQueryClient } from '@tanstack/react-query';
import { useCreateWellnessSession, useSetWellnessRoom } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import {
  useInstructorSessions,
  providerQueryKeys,
} from '../../lib/provider-queries';
import {
  selectInstructorSessions,
  type InstructorSessionVM,
} from '../../lib/instructor-sessions';
import {
  buildWellnessSessionInput,
  WellnessSessionInputError,
} from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { wellnessSessionStatusLabel, wellnessSessionTypeLabel } from '../../lib/enum-labels';

/**
 * PAR-10, both directions.
 *
 * READ: `sessionsQuery.data?.sessions` — the endpoint answers {data:[…]}, so
 * an instructor with real classes saw "No sessions yet". The row fields were
 * wrong too (`duration`, `level`, `startTime` against `durationMinutes`,
 * `scheduledAt`), so even a fixed envelope would have rendered "undefined min".
 *
 * WRITE: the create form posted {type:'yoga', duration, level, startTime} at a
 * schema wanting {type:'YOGA', durationMinutes, capacity, priceInr,
 * scheduledAt} — every submission 400'd, and capacity/priceInr (both required)
 * had no inputs. buildWellnessSessionInput now mirrors the server schema and
 * the modal collects the missing fields.
 *
 * WHICH ENDPOINT (the part PAR-10 did not fix). Even with the envelope right,
 * this screen was reading `GET /wellness/sessions` — the DEVOTEE catalogue,
 * filtered to `scheduledAt >= now AND status IN ('SCHEDULED','LIVE')` across
 * every instructor — and narrowing it with
 * `!s.instructorId || s.instructorId === user.id`, whose first clause keeps
 * other people's classes. So "My Sessions" listed classes this instructor does
 * not teach and hid every class they had already taught: a session created for
 * a date now past disappeared from its own author's screen, with a Set Room URL
 * button beside it that could not say whether a link was already set, because
 * the public handler strips `roomUrl` before answering.
 *
 * `GET /wellness/sessions/mine` is role-gated and instructor-scoped, so there
 * is no client-side ownership filter here at all — see lib/instructor-sessions.ts.
 *
 * The list is also invalidated by hand: useCreateWellnessSession invalidates
 * ['wellnessSessions'], which is nobody's query key on this screen, so a
 * successful create never refreshed it.
 */
const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'YOGA',
  durationMinutes: '60',
  capacity: '20',
  priceInr: '0',
  scheduledAt: '',
};

export default function WellnessSessionsScreen() {
  const sessionsQuery = useInstructorSessions();
  const createSession = useCreateWellnessSession();
  const setRoom = useSetWellnessRoom();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  // Server-scoped to this instructor. `null` means the read failed — which is
  // not the same statement as "you teach nothing" and must not render as one.
  const mySessions = selectInstructorSessions(sessionsQuery.data);

  const loadError = sessionsQuery.isError
    ? sessionsQuery.error instanceof Error
      ? sessionsQuery.error.message
      : 'Unknown error'
    : !sessionsQuery.isLoading && mySessions === null
      ? 'The server returned an unexpected response.'
      : null;

  async function onRefresh() {
    setRefreshing(true);
    await sessionsQuery.refetch();
    setRefreshing(false);
  }

  function handleSetRoom(s: InstructorSessionVM) {
    if (!Alert.prompt) {
      Alert.alert('Set Room URL', 'Use the desktop app or web portal to set room URLs.');
      return;
    }
    Alert.prompt(
      s.roomUrl ? 'Update room URL' : 'Set room URL',
      `Jitsi/Zoom link for "${s.title}"`,
      async (input?: string) => {
        const roomUrl = (input ?? '').trim();
        if (!roomUrl) return;
        // The server takes z.string().url(); catch it here so the instructor
        // gets a sentence instead of a 400.
        if (!/^https?:\/\/\S+\.\S+/.test(roomUrl)) {
          Alert.alert('Invalid link', 'Enter a full URL, e.g. https://meet.jit.si/your-room.');
          return;
        }
        try {
          await setRoom.mutateAsync({ sessionId: s.id, roomUrl });
          await queryClient.invalidateQueries({
            queryKey: providerQueryKeys.instructorSessions,
          });
          Alert.alert('Saved', 'Room URL updated.');
        } catch (err) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
        }
      },
      'plain-text',
      s.roomUrl ?? '',
    );
  }

  async function handleCreate() {
    let body;
    try {
      body = buildWellnessSessionInput(form);
    } catch (err) {
      Alert.alert(
        'Check the form',
        err instanceof WellnessSessionInputError ? err.message : 'Invalid session details.',
      );
      return;
    }
    try {
      await createSession.mutateAsync(body);
      await queryClient.invalidateQueries({
        queryKey: providerQueryKeys.instructorSessions,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create session');
    }
  }

  return (
    <PortalScreen
      title="Sessions"
      subtitle={
        sessionsQuery.isLoading && mySessions === null
          ? 'Loading…'
          : mySessions === null
            ? 'Unavailable'
            : `${mySessions.length} ${mySessions.length === 1 ? 'class' : 'classes'} you teach`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load your sessions: {loadError}</Text>
          <Text style={styles.errorHint}>
            Nothing is listed below. That is not a report that you teach no
            classes. Pull down to retry.
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
        {sessionsQuery.isLoading && mySessions === null ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : mySessions === null ? (
          <EmptyHint text="Your sessions could not be loaded." />
        ) : mySessions.length === 0 ? (
          <EmptyHint text="No sessions yet — schedule one to get started." />
        ) : (
          mySessions.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.cardPrimary}>{s.title}</Text>
              <Text style={styles.cardSecondary}>
                {[
                  wellnessSessionTypeLabel(s.type),
                  s.durationMinutes !== null ? `${s.durationMinutes} min` : null,
                  s.capacity !== null && s.enrolled !== null
                    ? `${s.enrolled}/${s.capacity} seats sold`
                    : s.capacity !== null
                      ? `${s.capacity} seats`
                      : null,
                  s.priceInr === null
                    ? null
                    : s.priceInr === 0
                      ? 'Free'
                      : `₹${s.priceInr.toLocaleString('en-IN')}`,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
              {s.scheduledAt ? (
                <Text style={styles.cardSecondary}>
                  {new Date(s.scheduledAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              ) : null}
              {s.status ? <Text style={styles.cardSecondary}>Status: {wellnessSessionStatusLabel(s.status)}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={() => handleSetRoom(s)}
                  activeOpacity={0.8}
                  disabled={setRoom.isPending}
                >
                  {/* /sessions/mine keeps roomUrl (the public catalogue strips
                      it), so this button can finally tell the truth about
                      whether a link is already set. */}
                  <Text style={styles.actionPrimaryText}>
                    {s.roomUrl ? 'Update room URL' : 'Set room URL'}
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
                placeholder="YOGA / MEDITATION / VIPASSANA / PRANAYAMA / OTHER"
                autoCapitalize="characters"
              />
              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={form.durationMinutes}
                onChangeText={(t) => setForm({ ...form, durationMinutes: t })}
                keyboardType="number-pad"
              />
              <Text style={styles.label}>Capacity (seats)</Text>
              <TextInput
                style={styles.input}
                value={form.capacity}
                onChangeText={(t) => setForm({ ...form, capacity: t })}
                keyboardType="number-pad"
              />
              <Text style={styles.label}>Price (₹ — 0 for a free class)</Text>
              <TextInput
                style={styles.input}
                value={form.priceInr}
                onChangeText={(t) => setForm({ ...form, priceInr: t })}
                keyboardType="number-pad"
              />
              <Text style={styles.label}>Start time (ISO, must be in the future)</Text>
              <TextInput
                style={styles.input}
                value={form.scheduledAt}
                onChangeText={(t) => setForm({ ...form, scheduledAt: t })}
                placeholder="2026-09-01T08:00:00.000Z"
                autoCapitalize="none"
              />
              <Text style={styles.label}>Description (required)</Text>
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
  errorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
  errorHint: { color: colors.red[600], fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
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
