import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { apiBase } from '../../lib/api';
import { applicationStatusLabel } from '../../lib/enum-labels';

interface Gurukul {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  tradition: string;
  isVerified: boolean;
  programs: { id: string; name: string; durationMonths: number }[];
}

interface Application {
  id: string;
  programId: string;
  programName: string | null;
  studentName: string;
  studentAgeYears: number;
  guardianName: string | null;
  guardianPhone: string | null;
  consentSigned: boolean;
  statement: string;
  status: 'submitted' | 'forwarded' | 'accepted' | 'rejected' | 'withdrawn';
  decisionNote: string | null;
  forwardedAt: string | null;
  decisionAt: string | null;
  createdAt: string;
}

type Decision = 'forwarded' | 'accepted' | 'rejected' | 'withdrawn';
type Tab = 'gurukuls' | 'applications';

const STATUS_COLORS: Record<Application['status'], { bg: string; fg: string }> = {
  submitted: { bg: '#dbeafe', fg: '#1d4ed8' },
  forwarded: { bg: '#fef3c7', fg: '#b45309' },
  accepted: { bg: '#d1fae5', fg: '#047857' },
  rejected: { bg: '#fee2e2', fg: '#b91c1c' },
  withdrawn: { bg: '#f3f4f6', fg: '#4b5563' },
};

export default function GurukulPortalScreen() {
  const { isAuthenticated, session } = useAuth();
  const [tab, setTab] = useState<Tab>('gurukuls');
  const [gurukuls, setGurukuls] = useState<Gurukul[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !session?.accessToken) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      const [gRes, aRes] = await Promise.all([
        fetch(`${apiBase()}/api/v1/gurukuls/mine/list`, { headers }),
        fetch(`${apiBase()}/api/v1/gurukul-portal/applications`, { headers }),
      ]);
      if (!gRes.ok) throw new Error(`Gurukuls: HTTP ${gRes.status}`);
      if (!aRes.ok) throw new Error(`Applications: HTTP ${aRes.status}`);
      const gData = await gRes.json();
      const aData = await aRes.json();
      setGurukuls(gData.gurukuls ?? []);
      setApplications(aData.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, session?.accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function decide(id: string, status: Decision, decisionNote?: string) {
    if (!session?.accessToken) return;
    setBusyId(id);
    try {
      const res = await fetch(`${apiBase()}/api/v1/gurukul-portal/applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ status, decisionNote }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApplications((arr) => arr.map((a) => (a.id === id ? { ...a, ...data.application } : a)));
    } catch (e) {
      Alert.alert('Action failed', e instanceof Error ? e.message : 'Try again later');
    } finally {
      setBusyId(null);
    }
  }

  function confirmDecide(app: Application, status: Decision) {
    if (status === 'forwarded') {
      decide(app.id, status);
      return;
    }
    Alert.prompt(
      status === 'accepted' ? 'Acceptance note (optional)' : 'Reason for rejection',
      undefined,
      (text?: string) => {
        if (status === 'rejected' && text === undefined) return;
        decide(app.id, status, text || undefined);
      },
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gurukul portal</Text>
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Please sign in to manage your gurukul.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gurukul portal</Text>
        <TouchableOpacity
          onPress={() => router.push('/(onboard)/become-gurukul' as any)}
          style={styles.headerCta}
        >
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.headerCtaText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'gurukuls' && styles.tabActive]}
          onPress={() => setTab('gurukuls')}
        >
          <Text style={[styles.tabText, tab === 'gurukuls' && styles.tabTextActive]}>
            Gurukuls ({gurukuls.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'applications' && styles.tabActive]}
          onPress={() => setTab('applications')}
        >
          <Text style={[styles.tabText, tab === 'applications' && styles.tabTextActive]}>
            Applications ({applications.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.saffron[600]} />
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && tab === 'gurukuls' && (
          <>
            {gurukuls.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="school-outline" size={40} color={colors.stone[400]} />
                <Text style={styles.emptyTitle}>No gurukuls yet</Text>
                <Text style={styles.emptyText}>Register your first gurukul to receive admission inquiries.</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.push('/(onboard)/become-gurukul' as any)}
                >
                  <Text style={styles.primaryBtnText}>Register gurukul</Text>
                </TouchableOpacity>
              </View>
            ) : (
              gurukuls.map((g) => (
                <View key={g.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle}>{g.name}</Text>
                    <View
                      style={[
                        styles.badge,
                        g.isVerified ? styles.badgeOk : styles.badgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: g.isVerified ? '#047857' : '#b45309' },
                        ]}
                      >
                        {g.isVerified ? 'Verified' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardTradition}>{g.tradition}</Text>
                  <Text style={styles.cardMeta}>
                    {g.city}, {g.state}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {g.programs.length} program{g.programs.length === 1 ? '' : 's'}
                  </Text>
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => router.push({ pathname: '/(devotee)/gurukul-detail', params: { slug: g.slug } } as any)}
                  >
                    <Text style={styles.linkText}>View public page →</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {!loading && !error && tab === 'applications' && (
          <>
            {applications.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={40} color={colors.stone[400]} />
                <Text style={styles.emptyTitle}>No applications yet</Text>
                <Text style={styles.emptyText}>
                  When seekers apply to your programs, you'll see them here.
                </Text>
              </View>
            ) : (
              applications.map((a) => {
                const decided = ['accepted', 'rejected', 'withdrawn'].includes(a.status);
                const status = STATUS_COLORS[a.status];
                return (
                  <View key={a.id} style={styles.card}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardTitle}>{a.studentName}</Text>
                      <View style={[styles.badge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.badgeText, { color: status.fg }]}>{applicationStatusLabel(a.status)}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>age {a.studentAgeYears}</Text>
                    <Text style={styles.cardMeta}>
                      {a.programName ?? a.programId} · {new Date(a.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                    {a.guardianName ? (
                      <Text style={styles.cardMeta}>
                        Guardian: {a.guardianName}
                        {a.guardianPhone ? ` · ${a.guardianPhone}` : ''}
                      </Text>
                    ) : null}
                    <Text style={styles.statementLabel}>Statement</Text>
                    <Text style={styles.statementText}>{a.statement}</Text>
                    {a.decisionNote ? (
                      <>
                        <Text style={styles.statementLabel}>Decision note</Text>
                        <Text style={styles.statementText}>{a.decisionNote}</Text>
                      </>
                    ) : null}
                    {!decided && (
                      <View style={styles.actionRow}>
                        {a.status === 'submitted' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionFwd]}
                            onPress={() => confirmDecide(a, 'forwarded')}
                            disabled={busyId === a.id}
                          >
                            <Text style={styles.actionText}>Forward</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionOk]}
                          onPress={() => confirmDecide(a, 'accepted')}
                          disabled={busyId === a.id}
                        >
                          <Text style={styles.actionText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionNo]}
                          onPress={() => confirmDecide(a, 'rejected')}
                          disabled={busyId === a.id}
                        >
                          <Text style={styles.actionText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.stone[50] },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { flex: 1, fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
  },
  headerCtaText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.saffron[600] },
  tabText: { fontSize: fontSize.sm, color: colors.stone[500], fontWeight: '600' },
  tabTextActive: { color: colors.saffron[700] },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { padding: spacing.xl, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900], marginTop: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.stone[600], textAlign: 'center' },
  primaryBtn: {
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 4,
  },
  cardTitle: { flex: 1, fontSize: fontSize.base, fontWeight: '800', color: colors.stone[900] },
  cardTradition: {
    fontSize: fontSize.xs,
    color: colors.saffron[700],
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: { fontSize: fontSize.xs, color: colors.stone[600], marginBottom: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeOk: { backgroundColor: '#d1fae5' },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: fontSize.xs, fontWeight: '700' },
  linkBtn: { marginTop: spacing.sm },
  linkText: { color: colors.saffron[700], fontWeight: '700', fontSize: fontSize.sm },
  statementLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.stone[700],
    marginTop: spacing.sm,
  },
  statementText: { fontSize: fontSize.sm, color: colors.stone[700], marginTop: 2, lineHeight: 20 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  actionFwd: { backgroundColor: '#f59e0b' },
  actionOk: { backgroundColor: '#059669' },
  actionNo: { backgroundColor: '#dc2626' },
  actionText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  errorBox: {
    backgroundColor: '#fde6df',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  errorText: { color: '#9a2a0a', fontSize: fontSize.sm },
});
