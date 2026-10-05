import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiPost } from '../../lib/api';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The AI Jyotish assistant, in the app — the mobile counterpart of
 * apps/web/app/astrology/chat.
 *
 *   POST /api/v1/astrology/ask
 *     body { message: string (1..2000), birthDetails?: { name, date, time, place } }
 *     -> { response: string, source: 'llm-grounded'|'llm'|'fallback-keyword'|'fallback-default' }
 *
 * Unauthenticated — the route has no `preHandler`, so this works before sign-in
 * exactly as the website's does.
 *
 * WHY THIS REPLACED A BOUNCE-OUT
 * ------------------------------
 * The astrology tab's headline call to action was a button reading "Ask AI
 * Jyotish" that opened the mobile browser. PAR-22 made it announce itself
 * rather than lie about staying in the app, which was the honest half of the
 * fix; the other half was that the endpoint behind that page is a plain
 * unauthenticated POST this app can call directly. It now does.
 *
 * WHAT `source` IS FOR, AND WHY IT IS SHOWN
 * ----------------------------------------
 * When the LLM call fails the route does not error — it returns a keyword-
 * matched or generic canned answer under `fallback-keyword` / `fallback-default`.
 * That is a sensible degrade, but a canned paragraph presented as a reading is
 * the app telling a devotee something it did not actually work out. So a
 * fallback answer is labelled as one. `llm-grounded` means birth details were
 * supplied and a real chart was computed from them; that is also worth saying,
 * because it is the difference between general guidance and a reading of YOUR
 * chart.
 *
 * NOTHING IS INVENTED. Every word in an assistant bubble comes from the
 * `response` field. There is no client-side canned reply, no simulated typing
 * of pre-written text, and no fabricated credential attached to the assistant.
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Present on assistant turns; drives the provenance label under the bubble. */
  source?: string;
}

interface BirthDetails {
  name: string;
  date: string;
  time: string;
  place: string;
}

const EMPTY_BIRTH: BirthDetails = { name: '', date: '', time: '', place: '' };

/** The API's own ceiling, mirrored so the request is never sent to be refused. */
const MAX_MESSAGE = 2000;

const STARTERS = [
  'What does my Mahadasha say about the next year?',
  'Which gemstone suits my Moon sign?',
  'Is there a good muhurat for a new business this month?',
  'What remedies help with Shani sade sati?',
];

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function isValidTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s.trim());
}

function provenanceOf(source: string | undefined): string | null {
  switch (source) {
    case 'llm-grounded':
      return 'Answered against a chart computed from the birth details you gave.';
    case 'llm':
      return 'General Jyotish guidance — no birth chart was used.';
    case 'fallback-keyword':
    case 'fallback-default':
      return 'The astrologer service was unreachable, so this is a stock answer, not a reading.';
    default:
      return null;
  }
}

export default function AstrologyChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showBirth, setShowBirth] = useState(false);
  const [birth, setBirth] = useState<BirthDetails>(EMPTY_BIRTH);
  const scrollRef = useRef<ScrollView>(null);

  const birthUsable = isValidDate(birth.date);
  const birthError =
    birth.date.trim().length > 0 && !isValidDate(birth.date)
      ? 'Birth date must be YYYY-MM-DD.'
      : birth.time.trim().length > 0 && !isValidTime(birth.time)
        ? 'Birth time must be HH:MM in 24-hour form.'
        : null;

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (message.length === 0 || sending) return;
      if (message.length > MAX_MESSAGE) {
        setSendError(`Keep the question under ${MAX_MESSAGE} characters.`);
        return;
      }
      setSendError(null);
      setDraft('');
      const mine: ChatMessage = { id: `u${Date.now()}`, role: 'user', text: message };
      setMessages((prev) => [...prev, mine]);
      setSending(true);
      try {
        const body = await apiPost<{ response?: unknown; source?: unknown }>('/astrology/ask', {
          message,
          // `birthDetails` is only worth sending when the DATE is present: the
          // route computes a chart from `birthDetails.date` and ignores the
          // block entirely without one.
          ...(birthUsable
            ? {
                birthDetails: {
                  name: birth.name.trim() || undefined,
                  date: birth.date.trim(),
                  time: birth.time.trim() || undefined,
                  place: birth.place.trim() || undefined,
                },
              }
            : {}),
        });
        const text = typeof body.response === 'string' ? body.response.trim() : '';
        if (text.length === 0) {
          // A 200 with nothing to read is a failure, not an empty answer. Saying
          // so beats printing a blank bubble the devotee cannot tell from a
          // rendering bug.
          setSendError('The astrologer service replied with nothing. Please try again.');
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a${Date.now()}`,
            role: 'assistant',
            text,
            source: typeof body.source === 'string' ? body.source : undefined,
          },
        ]);
      } catch (err) {
        setSendError(
          err instanceof Error
            ? `Could not reach the astrologer service. ${err.message}`
            : 'Could not reach the astrologer service.',
        );
      } finally {
        setSending(false);
      }
    },
    [birth, birthUsable, sending],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Jyotish assistant</Text>
          <Text style={styles.headerSubtitle}>
            {birthUsable ? 'Using your birth details' : 'General guidance · add birth details for a chart'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.birthToggle}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={showBirth ? 'Hide birth details' : 'Add birth details'}
          accessibilityState={{ expanded: showBirth }}
          onPress={() => setShowBirth((v) => !v)}
        >
          <Ionicons
            name={birthUsable ? 'person-circle' : 'person-circle-outline'}
            size={26}
            color={colors.saffron[600]}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {showBirth ? (
          <View style={styles.birthPanel}>
            <Text style={styles.birthTitle}>Birth details (optional)</Text>
            <Text style={styles.birthNote}>
              With a birth date the answer is worked out against a computed chart. Without one it
              is general Jyotish guidance. Nothing here is stored on your device.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.stone[400]}
              value={birth.name}
              onChangeText={(v) => setBirth((b) => ({ ...b, name: v }))}
              autoCapitalize="words"
              accessibilityLabel="Your name"
            />
            <View style={styles.birthRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Birth date (YYYY-MM-DD)"
                placeholderTextColor={colors.stone[400]}
                value={birth.date}
                onChangeText={(v) => setBirth((b) => ({ ...b, date: v }))}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Birth date, year dash month dash day"
              />
              <TextInput
                style={[styles.input, { width: 108 }]}
                placeholder="HH:MM"
                placeholderTextColor={colors.stone[400]}
                value={birth.time}
                onChangeText={(v) => setBirth((b) => ({ ...b, time: v }))}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Birth time, 24 hour"
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Birth place (city)"
              placeholderTextColor={colors.stone[400]}
              value={birth.place}
              onChangeText={(v) => setBirth((b) => ({ ...b, place: v }))}
              accessibilityLabel="Birth place"
            />
            {birthError ? <Text style={styles.birthError}>{birthError}</Text> : null}
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.intro}>
              <Ionicons name="sparkles" size={30} color={colors.saffron[500]} />
              <Text style={styles.introTitle}>Ask about your chart</Text>
              <Text style={styles.introBody}>
                Marriage, career, health, doshas, remedies, muhurat. Answers follow Vedic sidereal
                Jyotish. This is guidance, not a substitute for a consultation with a real
                astrologer.
              </Text>
              <View style={styles.starterWrap}>
                {STARTERS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.starter}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={s}
                    onPress={() => void send(s)}
                  >
                    <Text style={styles.starterText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {messages.map((m) => {
            const provenance = m.role === 'assistant' ? provenanceOf(m.source) : null;
            const isFallback =
              m.source === 'fallback-keyword' || m.source === 'fallback-default';
            return (
              <View key={m.id} style={m.role === 'user' ? styles.rowRight : styles.rowLeft}>
                <View style={m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
                  <Text style={m.role === 'user' ? styles.bubbleUserText : styles.bubbleBotText}>
                    {m.text}
                  </Text>
                </View>
                {provenance ? (
                  <Text style={[styles.provenance, isFallback && styles.provenanceWarn]}>
                    {provenance}
                  </Text>
                ) : null}
              </View>
            );
          })}

          {sending ? (
            <View style={styles.rowLeft}>
              <View style={[styles.bubbleBot, styles.bubbleThinking]}>
                <ActivityIndicator size="small" color={colors.saffron[600]} />
                <Text style={styles.thinkingText}>Consulting the chart…</Text>
              </View>
            </View>
          ) : null}

          {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}

          {messages.length > 0 ? (
            <TouchableOpacity
              style={styles.escalate}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Talk to an astrologer"
              accessibilityHint="Opens the astrologer directory in the app"
              onPress={() => router.push('/(devotee)/astrologers' as never)}
            >
              <Ionicons name="person-outline" size={16} color={colors.saffron[700]} />
              <Text style={styles.escalateText}>Talk to an astrologer instead</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder="Ask about marriage, career, health, remedies…"
            placeholderTextColor={colors.stone[400]}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={MAX_MESSAGE}
            editable={!sending}
            accessibilityLabel="Your question"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (sending || draft.trim().length === 0) && styles.sendBtnOff]}
            activeOpacity={0.85}
            disabled={sending || draft.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Send question"
            onPress={() => void send(draft)}
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
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
    marginLeft: -spacing.sm,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1 },
  birthToggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  birthPanel: {
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  birthTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  birthNote: { fontSize: fontSize.xs, color: colors.stone[500], lineHeight: 16 },
  birthRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.stone[900],
    backgroundColor: colors.white,
  },
  birthError: { fontSize: fontSize.xs, color: colors.red[600] },

  thread: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.lg },
  intro: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  introTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  introBody: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  starterWrap: { gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.sm },
  starter: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  starterText: { fontSize: fontSize.sm, color: colors.stone[700] },

  rowLeft: { alignItems: 'flex-start', gap: 3 },
  rowRight: { alignItems: 'flex-end', gap: 3 },
  bubbleUser: {
    maxWidth: '88%',
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUserText: { fontSize: fontSize.sm, color: colors.white, lineHeight: 20 },
  bubbleBot: {
    maxWidth: '92%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleBotText: { fontSize: fontSize.sm, color: colors.stone[800], lineHeight: 21 },
  bubbleThinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thinkingText: { fontSize: fontSize.sm, color: colors.stone[500] },
  provenance: { fontSize: fontSize.xs, color: colors.stone[400], paddingHorizontal: spacing.xs },
  provenanceWarn: { color: colors.red[600] },
  sendError: { fontSize: fontSize.sm, color: colors.red[600], lineHeight: 20 },

  escalate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  escalateText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.saffron[700] },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 132,
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: fontSize.base,
    color: colors.stone[900],
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffron[600],
  },
  sendBtnOff: { backgroundColor: colors.stone[300] },
});
