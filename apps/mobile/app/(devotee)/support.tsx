import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  useSupportTickets,
  useCreateSupportTicket,
} from '@poojly/api-client';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface TicketRow {
  id: string;
  subject?: string;
  status?: string;
  category?: string;
  priority?: string;
  createdAt?: string;
  lastMessageAt?: string;
}

function statusColor(status?: string): string {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('resolv') || s.includes('closed')) return colors.green[600];
  if (s.includes('open') || s.includes('new')) return colors.amber[600];
  if (s.includes('progress')) return colors.saffron[600];
  return colors.stone[600];
}

export default function SupportScreen() {
  const ticketsQuery = useSupportTickets();
  const createTicket = useCreateSupportTicket();
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'general',
    priority: 'normal',
    body: '',
  });

  const tickets = (ticketsQuery.data?.data as TicketRow[] | undefined) ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await ticketsQuery.refetch();
    setRefreshing(false);
  }

  async function handleSubmit() {
    if (!form.subject.trim() || !form.body.trim()) {
      Alert.alert('Required', 'Subject and message are required.');
      return;
    }
    try {
      await createTicket.mutateAsync({
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        body: form.body.trim(),
      });
      setCreateOpen(false);
      setForm({ subject: '', category: 'general', priority: 'normal', body: '' });
      Alert.alert('Submitted', 'Your support ticket has been created.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create ticket');
    }
  }

  return (
    <PortalScreen
      title="Support"
      subtitle={`${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {ticketsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load tickets:{' '}
            {ticketsQuery.error instanceof Error ? ticketsQuery.error.message : 'Unknown error'}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => setCreateOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.createBtnText}>+ New Ticket</Text>
      </TouchableOpacity>

      {ticketsQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : tickets.length === 0 ? (
        <EmptyHint text="No tickets yet — submit one if you need help." />
      ) : (
        tickets.map((t) => (
          <View key={t.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardPrimary}>{t.subject ?? '(no subject)'}</Text>
                <Text style={styles.cardSecondary}>
                  {(t.category ?? '—')} • {(t.priority ?? 'normal')}
                  {t.createdAt ? ` • ${new Date(t.createdAt).toLocaleDateString('en-IN')}` : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.pill,
                  { backgroundColor: `${statusColor(t.status)}1A`, borderColor: statusColor(t.status) },
                ]}
              >
                <Text style={[styles.pillText, { color: statusColor(t.status) }]}>{t.status ?? 'open'}</Text>
              </View>
            </View>
          </View>
        ))
      )}

      <Modal
        visible={createOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>New Support Ticket</Text>

              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={form.subject}
                onChangeText={(t) => setForm({ ...form, subject: t })}
              />

              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={form.category}
                onChangeText={(t) => setForm({ ...form, category: t })}
                placeholder="general / booking / payment / account"
              />

              <Text style={styles.label}>Priority</Text>
              <TextInput
                style={styles.input}
                value={form.priority}
                onChangeText={(t) => setForm({ ...form, priority: t })}
                placeholder="low / normal / high"
              />

              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, { height: 120 }]}
                value={form.body}
                onChangeText={(t) => setForm({ ...form, body: t })}
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
                  onPress={handleSubmit}
                  disabled={createTicket.isPending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionPrimaryText}>
                    {createTicket.isPending ? 'Submitting...' : 'Submit'}
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
  createBtn: {
    backgroundColor: colors.saffron[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardPrimary: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardSecondary: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },
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
});
