import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@poojly/api-client';
import { useAuth } from './auth-context';
import { colors, spacing, fontSize, borderRadius } from './theme';

// Mirror of apps/web/components/Inbox.tsx — same endpoints, same 3s poll
// cadence, same since-cursor pattern. Calls + ratings are intentionally
// out of scope for v1 (web-only for now; documented in the launch plan).

interface Counterparty {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

interface ConversationSummary {
  id: string;
  kind: string;
  side: 'devotee' | 'provider';
  counterparty: Counterparty;
  linkedBookingId: string | null;
  subject: string | null;
  unread: number;
  lastMessage: { body: string; kind: string; createdAt: string } | null;
  lastMessageAt: string;
}

interface Message {
  id: string;
  senderId: string;
  sender: { fullName: string; avatarUrl: string | null };
  mine: boolean;
  kind: 'text' | 'system' | 'call_link';
  body: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const POLL_INTERVAL_MS = 3000;

export function Inbox({ role }: { role: 'devotee' | 'provider' }) {
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConvs = useCallback(async () => {
    try {
      const data = await api.get<{ conversations: ConversationSummary[] }>(
        `/api/v1/conversations?role=${role}`,
      );
      setConversations(data.conversations ?? []);
    } catch {
      // ignore polling errors — UI keeps showing whatever it has
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchConvs();
    const i = setInterval(fetchConvs, POLL_INTERVAL_MS);
    return () => clearInterval(i);
  }, [fetchConvs, isAuthenticated]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchConvs();
    setRefreshing(false);
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.emptyTitle}>Sign in to view messages</Text>
          <Text style={styles.emptyHint}>
            Chat with your priests, astrologers, and providers about bookings.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (activeId) {
    const active = conversations.find((c) => c.id === activeId);
    return (
      <Thread
        conversationId={activeId}
        counterpartyName={active?.counterparty.fullName ?? 'Conversation'}
        onBack={() => setActiveId(null)}
        onMessagesChanged={fetchConvs}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.saffron[600]} />
          <Text style={styles.loadingText}>Loading messages…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyHint}>
            Book a puja or consultation to start a conversation with a provider.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => <ConversationRow conv={item} onPress={() => setActiveId(item.id)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

function ConversationRow({ conv, onPress }: { conv: ConversationSummary; onPress: () => void }) {
  const initials = conv.counterparty.fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const time = new Date(conv.lastMessageAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || '?'}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={styles.rowName} numberOfLines={1}>
            {conv.counterparty.fullName}
          </Text>
          {conv.unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conv.unread}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rowSnippet} numberOfLines={1}>
          {conv.lastMessage?.kind === 'system' ? '· ' : ''}
          {conv.lastMessage?.kind === 'call_link' ? '📞 ' : ''}
          {conv.lastMessage?.body ?? 'No messages yet'}
        </Text>
        <Text style={styles.rowMeta}>
          {time} · {conv.kind.replace(/_/g, ' ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

interface ThreadProps {
  conversationId: string;
  counterpartyName: string;
  onBack: () => void;
  onMessagesChanged: () => void;
}

function Thread({ conversationId, counterpartyName, onBack, onMessagesChanged }: ThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const sinceRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const fetchMessages = useCallback(
    async (reset = false) => {
      try {
        const path =
          `/api/v1/conversations/${conversationId}/messages` +
          (sinceRef.current && !reset ? `?since=${encodeURIComponent(sinceRef.current)}` : '');
        const data = await api.get<{ messages: Message[]; serverTime: string }>(path);
        sinceRef.current = data.serverTime;
        if (reset) {
          setMessages(data.messages ?? []);
        } else if (data.messages?.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = data.messages.filter((m) => !seen.has(m.id));
            return fresh.length === 0 ? prev : [...prev, ...fresh];
          });
        }
      } catch {
        // ignore — the next poll will retry
      }
    },
    [conversationId],
  );

  useEffect(() => {
    sinceRef.current = null;
    fetchMessages(true);
    api.post(`/api/v1/conversations/${conversationId}/read`, {}).catch(() => undefined);
    const i = setInterval(() => fetchMessages(false), POLL_INTERVAL_MS);
    return () => clearInterval(i);
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      // FlatList inverted={false} + scrollToEnd is the simplest reliable autoscroll on RN.
      const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await api.post(`/api/v1/conversations/${conversationId}/messages`, { body });
      setDraft('');
      await fetchMessages(false);
      onMessagesChanged();
    } catch {
      // surfaces as a stale draft staying in the input — user can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.threadHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.stone[700]} />
        </TouchableOpacity>
        <Text style={styles.threadTitle} numberOfLines={1}>
          {counterpartyName}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.threadList}
          renderItem={({ item }) => <MessageBubble msg={item} />}
        />
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message…"
            placeholderTextColor={colors.stone[400]}
            style={styles.input}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.send, (!draft.trim() || sending) ? styles.sendDisabled : null]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.kind === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{msg.body}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.bubbleRow, msg.mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <View style={[styles.bubble, msg.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, msg.mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
          {msg.body}
        </Text>
        <Text style={[styles.bubbleTime, msg.mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.stone[800] },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.stone[500], fontSize: fontSize.sm },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.stone[700] },
  emptyHint: { fontSize: fontSize.sm, color: colors.stone[500], textAlign: 'center', maxWidth: 280 },

  separator: { height: 1, backgroundColor: colors.stone[100], marginLeft: 64 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.saffron[700], fontWeight: '700', fontSize: fontSize.sm },
  rowBody: { flex: 1, minWidth: 0 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  rowName: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[800], flex: 1 },
  rowSnippet: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  rowMeta: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 2 },
  badge: {
    backgroundColor: colors.saffron[600],
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  threadTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[800], flex: 1, textAlign: 'center' },

  threadList: { padding: spacing.md, gap: spacing.sm },

  bubbleRow: { flexDirection: 'row', marginBottom: spacing.xs },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  bubbleMine: { backgroundColor: colors.saffron[600], borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.stone[100] },
  bubbleText: { fontSize: fontSize.sm, lineHeight: 20 },
  bubbleTextMine: { color: colors.white },
  bubbleTextTheirs: { color: colors.stone[800] },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  bubbleTimeTheirs: { color: colors.stone[400] },

  systemRow: { alignItems: 'center', marginVertical: spacing.xs },
  systemText: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
    backgroundColor: colors.stone[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.stone[50],
    borderRadius: borderRadius.lg,
    fontSize: fontSize.sm,
    color: colors.stone[800],
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.saffron[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: colors.stone[300] },
});
