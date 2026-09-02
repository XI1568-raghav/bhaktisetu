/**
 * Support — the help centre, the devotee's tickets, and the form that files one.
 *
 * TWO DEFECTS THIS SCREEN CARRIED
 * ------------------------------
 * 1. EVERY TICKET FILED FROM THE PHONE WAS REJECTED. The category and priority
 *    were free-text `TextInput`s defaulting to `'general'` and `'normal'`.
 *    `apps/api/src/routes/support.ts:413-414` parses
 *    `z.enum(['BOOKING','PAYMENT','ACCOUNT','TECHNICAL','OTHER'])` and
 *    `z.enum(['LOW','MEDIUM','HIGH','URGENT'])`. `z.enum` does not coerce, so
 *    the create returned 400 before it ever reached the database — and the
 *    catch below rendered the raw failure as "Error", which reads like the
 *    network dropped. The pickers are now built from constants copied verbatim
 *    off the route (lib/account-api.ts), so they cannot drift apart again.
 *    `lib/enum-labels.ts` already held the correct uppercase keys, which is how
 *    the mismatch was visible at all.
 *
 * 2. THE TICKET LIST WAS A DEAD END. A devotee could see that they had filed a
 *    ticket and could not open it. The reply lands in their email inbox
 *    (support.ts:565-578) and nowhere in the app. Rows now push
 *    `(devotee)/support-ticket`, which reads the thread and can answer it.
 *
 * The help-centre link is unchanged: `lib/help-centre.ts` is the one place the
 * destination is decided, and this screen calls it exactly as before (I18N-09).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { HELP_CENTRE_LABEL, openHelpCentre } from '../../lib/help-centre';
import { supportTicketCategoryLabel, supportTicketStatusLabel } from '../../lib/enum-labels';
import {
  EMPTY_TICKET_FORM,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  createTicket,
  failureMessage,
  fetchTickets,
  formatDate,
  selectCreatedTicketId,
  selectTickets,
  validateTicketForm,
  type TicketFormValues,
} from '../../lib/account-api';

/**
 * Narrow an `unknown` field to a non-empty string.
 *
 * Not cosmetic: `lib/__tests__/enum-labels.cm10.test.ts` allows exactly one
 * narrowing call inside a label call — `Label(text(x))` — and nothing else, so
 * an inline `typeof x === 'string' ? x : undefined` reads to that guard as a
 * raw enum reaching a `<Text>`. Same helper, same name, as bookings.tsx.
 */
function text(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function statusColor(status?: string): string {
  const s = String(status ?? '').toUpperCase();
  if (s === 'RESOLVED' || s === 'CLOSED') return colors.green[600];
  if (s === 'IN_PROGRESS') return colors.saffron[600];
  return colors.amber[600];
}

/** `MEDIUM` -> `Medium`. The route's own casing, made readable. */
function priorityLabel(priority: unknown): string {
  const p = String(priority ?? '').toUpperCase();
  if (p.length === 0) return '';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

export default function SupportScreen() {
  const queryClient = useQueryClient();
  const ticketsQuery = useQuery({
    queryKey: ['supportTickets', 'list'],
    queryFn: fetchTickets,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<TicketFormValues>(EMPTY_TICKET_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tickets = selectTickets(ticketsQuery.data);

  async function onRefresh() {
    setRefreshing(true);
    await ticketsQuery.refetch();
    setRefreshing(false);
  }

  function openTicket(id: string) {
    router.push({ pathname: '/(devotee)/support-ticket', params: { id } } as never);
  }

  async function handleSubmit() {
    if (submitting) return;
    const problem = validateTicketForm(form);
    if (problem !== null) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await createTicket(form);
      setCreateOpen(false);
      setForm(EMPTY_TICKET_FORM);
      await queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      await ticketsQuery.refetch();
      // Land the devotee in the thread they just opened rather than back on a
      // list, so the ticket number and "we have it" state are the first thing
      // they see. A create that returns an unreadable body just refreshes.
      const id = selectCreatedTicketId(created);
      if (id !== null) openTicket(id);
    } catch (err) {
      setFormError(failureMessage(err, 'Creating your ticket'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalScreen
      title="Support"
      subtitle={
        ticketsQuery.isLoading
          ? 'Loading…'
          : ticketsQuery.isError
            ? 'Could not load your tickets'
            : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/*
        I18N-09: the answer before the queue. Filing a ticket waits on a human;
        most of what devotees ask here is already written up on the web help
        centre, which the app previously did not link to anywhere at all.
      */}
      <TouchableOpacity
        style={styles.helpBtn}
        onPress={() => {
          void openHelpCentre(Linking.openURL);
        }}
        activeOpacity={0.8}
        accessibilityRole="link"
        accessibilityLabel={`${HELP_CENTRE_LABEL} — opens in your browser`}
      >
        <Text style={styles.helpBtnText}>{HELP_CENTRE_LABEL}</Text>
        <Text style={styles.helpBtnHint}>
          Step-by-step guides — opens darshya.online in your browser
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => {
          setForm(EMPTY_TICKET_FORM);
          setFormError(null);
          setCreateOpen(true);
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="File a new support ticket"
      >
        <Text style={styles.createBtnText}>+ New Ticket</Text>
      </TouchableOpacity>

      {ticketsQuery.isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading your tickets…</Text>
        </View>
      ) : ticketsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>Could not load your tickets</Text>
          <Text style={styles.errorText}>
            {ticketsQuery.error instanceof Error
              ? ticketsQuery.error.message
              : 'Something went wrong reaching Darshya.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void ticketsQuery.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Try loading your tickets again"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : tickets.length === 0 ? (
        <EmptyHint text="No tickets yet — file one and support will reply here and by email." />
      ) : (
        tickets.map((t) => {
          const colour = statusColor(text(t.status));
          const priority = priorityLabel(t.priority);
          return (
            <TouchableOpacity
              key={t.id}
              style={styles.card}
              onPress={() => openTicket(t.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Open ticket: ${t.subject ?? 'no subject'}`}
              accessibilityHint="Reads the conversation and lets you reply"
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>{t.subject ?? '(no subject)'}</Text>
                  <Text style={styles.cardSecondary}>
                    {[
                      typeof t.ticketNumber === 'string' ? t.ticketNumber : null,
                      supportTicketCategoryLabel(text(t.category)) || null,
                      priority.length > 0 ? priority : null,
                      formatDate(t.createdAt) || null,
                    ]
                      .filter((v): v is string => typeof v === 'string' && v.length > 0)
                      .join('  ·  ')}
                  </Text>
                </View>
                <View
                  style={[styles.pill, { backgroundColor: `${colour}1A`, borderColor: colour }]}
                >
                  <Text style={[styles.pillText, { color: colour }]}>
                    {supportTicketStatusLabel(text(t.status)) || 'Open'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <Modal
        visible={createOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New support ticket</Text>

              {formError ? (
                <View style={styles.formError}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={form.subject}
                onChangeText={(t) => setForm({ ...form, subject: t })}
                placeholder="What is this about?"
                placeholderTextColor={colors.stone[400]}
                maxLength={200}
                accessibilityLabel="Ticket subject"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipRow}>
                {TICKET_CATEGORIES.map((option) => {
                  const active = form.category === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setForm({ ...form, category: option })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Category: ${supportTicketCategoryLabel(option)}`}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {supportTicketCategoryLabel(option)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Priority</Text>
              <View style={styles.chipRow}>
                {TICKET_PRIORITIES.map((option) => {
                  const active = form.priority === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setForm({ ...form, priority: option })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Priority: ${priorityLabel(option)}`}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {priorityLabel(option)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.body}
                onChangeText={(t) => setForm({ ...form, body: t })}
                placeholder="Booking number, what happened, and what you need"
                placeholderTextColor={colors.stone[400]}
                multiline
                maxLength={10000}
                accessibilityLabel="Describe your issue"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionGhost]}
                  onPress={() => setCreateOpen(false)}
                  disabled={submitting}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.actionGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary, submitting && styles.disabled]}
                  onPress={() => void handleSubmit()}
                  disabled={submitting}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Submit ticket"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.actionPrimaryText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  centreText: { color: colors.stone[500], fontSize: fontSize.base },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  createBtn: {
    backgroundColor: colors.saffron[600],
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.lg },
  helpBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.saffron[600],
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  helpBtnText: { color: colors.saffron[600], fontWeight: '700', fontSize: fontSize.base },
  helpBtnHint: { color: colors.stone[600], fontSize: fontSize.xs, marginTop: 2, textAlign: 'center' },
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  formError: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  formErrorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
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
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: fontSize.lg,
    color: colors.stone[900],
  },
  textArea: { height: 140, textAlignVertical: 'top', paddingTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
  },
  chipActive: { backgroundColor: colors.saffron[600] },
  chipText: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[600] },
  chipTextActive: { color: colors.white },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    minHeight: 44,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionPrimary: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  actionPrimaryText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  actionGhost: { backgroundColor: colors.white, borderColor: colors.stone[300] },
  actionGhostText: { color: colors.stone[700], fontSize: fontSize.base, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
