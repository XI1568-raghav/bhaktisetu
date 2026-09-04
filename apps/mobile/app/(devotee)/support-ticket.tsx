/**
 * One support ticket — the conversation, not just the row.
 *
 * WHAT THIS CLOSES
 * ----------------
 * apps/web has `/support/tickets/view`, where a devotee reads the thread and
 * replies to whoever picked their ticket up. The mobile app had a list of
 * subject lines and no way to open one, so a devotee who filed a ticket from
 * the phone could see that it existed and never read the answer — the reply
 * arrives by email (support.ts:565-578 sends it) and the app showed nothing.
 *
 * ENDPOINTS (apps/api/src/routes/support.ts)
 *   GET  /tickets/:id          -> { data: { ...ticket, messages[] } }, owner or
 *                                 admin only; internal notes are filtered out
 *                                 server-side for a non-admin owner, so this
 *                                 screen never has to hide anything itself.
 *   POST /tickets/:id/messages -> 201 { data: message }
 *
 * WHAT IS DELIBERATELY ABSENT. There is no "close this ticket" control.
 * `PATCH /tickets/:id` is admin-gated (support.ts:611-613 returns 403 to
 * everybody else), so a devotee-facing button would be a guaranteed error
 * dialog. A control that cannot work is worse than no control.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { supportTicketCategoryLabel, supportTicketStatusLabel } from '../../lib/enum-labels';
import {
  failureMessage,
  fetchTicket,
  formatDateTime,
  replyToTicket,
  selectTicketDetail,
  validateTicketReply,
} from '../../lib/account-api';

/**
 * Narrow an `unknown` field to a non-empty string. `enum-labels.cm10.test.ts`
 * allows exactly one narrowing call inside a label call — `Label(text(x))` —
 * so an inline ternary reads to that guard as a raw enum reaching a `<Text>`.
 */
function text(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function statusColor(status: unknown): string {
  const s = String(status ?? '').toUpperCase();
  if (s === 'RESOLVED' || s === 'CLOSED') return colors.green[600];
  if (s === 'IN_PROGRESS') return colors.saffron[600];
  return colors.amber[600];
}

function priorityLabel(priority: unknown): string {
  const p = String(priority ?? '').toUpperCase();
  if (p.length === 0) return '';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

export default function SupportTicketScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const queryClient = useQueryClient();

  const ticketQuery = useQuery({
    queryKey: ['supportTickets', 'detail', id],
    queryFn: () => fetchTicket(id as string),
    enabled: typeof id === 'string' && id.length > 0,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const ticket = selectTicketDetail(ticketQuery.data);

  async function onRefresh() {
    setRefreshing(true);
    await ticketQuery.refetch();
    setRefreshing(false);
  }

  async function handleSend() {
    if (typeof id !== 'string' || sending) return;
    const problem = validateTicketReply(reply);
    if (problem !== null) {
      setReplyError(problem);
      return;
    }
    setReplyError(null);
    setSending(true);
    try {
      await replyToTicket(id, reply);
      setReply('');
      // The list carries no message count, but it does carry the ticket row the
      // server may have re-stamped; refresh both rather than guess.
      await queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      await ticketQuery.refetch();
    } catch (err) {
      setReplyError(failureMessage(err, 'Sending your reply'));
    } finally {
      setSending(false);
    }
  }

  function renderBody() {
    if (typeof id !== 'string' || id.length === 0) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>No ticket to open</Text>
          <Text style={styles.errorText}>
            This screen was opened without a ticket reference. Go back to Support and tap a ticket.
          </Text>
        </View>
      );
    }

    if (ticketQuery.isLoading) {
      return (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading this ticket…</Text>
        </View>
      );
    }

    if (ticketQuery.isError) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Could not load this ticket</Text>
          <Text style={styles.errorText}>
            {ticketQuery.error instanceof Error
              ? ticketQuery.error.message
              : 'Something went wrong reaching Darshya.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void ticketQuery.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Try loading this ticket again"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (ticket === null) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Ticket not found</Text>
          <Text style={styles.errorText}>
            Darshya answered, but without a ticket in the response. It may have been removed.
          </Text>
        </View>
      );
    }

    const colour = statusColor(ticket.status);
    const priority = priorityLabel(ticket.priority);

    return (
      <>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.subject}>{ticket.subject ?? '(no subject)'}</Text>
            <View
              style={[styles.pill, { backgroundColor: `${colour}1A`, borderColor: colour }]}
            >
              <Text style={[styles.pillText, { color: colour }]}>
                {supportTicketStatusLabel(text(ticket.status)) || 'Open'}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {[
              text(ticket.ticketNumber) ?? null,
              supportTicketCategoryLabel(text(ticket.category)) || null,
              priority.length > 0 ? `${priority} priority` : null,
              formatDateTime(ticket.createdAt) || null,
            ]
              .filter((part): part is string => typeof part === 'string' && part.length > 0)
              .join('  ·  ')}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Conversation</Text>

        {/* The opening message is the ticket's own `body` column — the route
            stores it there and does NOT also create a first SupportTicketMessage
            (support.ts:443-456). Rendering it here is reading a real field, not
            synthesising a message that does not exist. */}
        <View style={[styles.bubble, styles.bubbleMine]}>
          <Text style={styles.bubbleAuthor}>You</Text>
          <Text style={styles.bubbleBody}>{ticket.body ?? ''}</Text>
          <Text style={styles.bubbleTime}>{formatDateTime(ticket.createdAt)}</Text>
        </View>

        {ticket.messages.length === 0 ? (
          <Text style={styles.awaiting}>
            No replies yet. Support answers by email as well as here.
          </Text>
        ) : (
          ticket.messages.map((m) => (
            <View key={m.id} style={styles.bubble}>
              <Text style={styles.bubbleBody}>{text(m.body) ?? ''}</Text>
              <Text style={styles.bubbleTime}>{formatDateTime(m.createdAt)}</Text>
            </View>
          ))
        )}
      </>
    );
  }

  const canReply = ticket !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Support ticket</Text>
          <Text style={styles.subtitle}>
            {(ticket === null ? undefined : text(ticket.ticketNumber)) ??
              'Your conversation with Darshya support'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {renderBody()}
          <View style={{ height: spacing.md }} />
        </ScrollView>

        {canReply ? (
          <View style={styles.composer}>
            {replyError ? <Text style={styles.composerError}>{replyError}</Text> : null}
            <View style={styles.composerRow}>
              <TextInput
                style={styles.composerInput}
                value={reply}
                onChangeText={setReply}
                placeholder="Write a reply…"
                placeholderTextColor={colors.stone[400]}
                multiline
                maxLength={10000}
                accessibilityLabel="Reply to this ticket"
              />
              <TouchableOpacity
                style={[styles.sendBtn, (sending || reply.trim().length === 0) && styles.sendDisabled]}
                onPress={() => void handleSend()}
                disabled={sending || reply.trim().length === 0}
                accessibilityRole="button"
                accessibilityLabel="Send reply"
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="send" size={20} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  centre: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  centreText: { color: colors.stone[500], fontSize: fontSize.base },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  errorTitle: { color: colors.red[600], fontSize: fontSize.base, fontWeight: '700' },
  errorText: { color: colors.stone[700], fontSize: fontSize.sm, marginTop: 4 },
  retryBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.red[500],
  },
  retryText: { color: colors.red[600], fontWeight: '700', fontSize: fontSize.sm },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  subject: { flex: 1, fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  meta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },

  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[700],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bubbleMine: { backgroundColor: colors.saffron[50], borderColor: colors.saffron[200] },
  bubbleAuthor: { fontSize: fontSize.xs, fontWeight: '700', color: colors.saffron[700] },
  bubbleBody: { fontSize: fontSize.base, color: colors.stone[800], lineHeight: 20, marginTop: 2 },
  bubbleTime: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 6 },
  awaiting: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },

  composer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  composerError: { color: colors.red[600], fontSize: fontSize.sm, marginBottom: 6 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 44,
    maxHeight: 120,
    fontSize: fontSize.lg,
    color: colors.stone[900],
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffron[600],
  },
  sendDisabled: { opacity: 0.5 },
});
