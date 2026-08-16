import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDarshanStream } from '@poojly/api-client';
import { selectStreamDetail } from '../../lib/api-contracts';
import { resolveStreamPlayback } from '../../lib/stream-authority';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

// react-native-webview is optional — Expo Go ships it, bare RN may not.
// We require() it lazily so a missing module gracefully degrades to "Open in YouTube".
let WebViewComp: React.ComponentType<{ source: { uri?: string; html?: string; baseUrl?: string }; style?: object; allowsFullscreenVideo?: boolean; mediaPlaybackRequiresUserAction?: boolean; allowsInlineMediaPlayback?: boolean; originWhitelist?: string[] }> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  WebViewComp = (require('react-native-webview') as { WebView: typeof WebViewComp }).WebView;
} catch {
  WebViewComp = null;
}

function youtubeEmbedUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  const ytMatch = rawUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/))([A-Za-z0-9_-]{6,})/,
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&playsinline=1`;
  }
  return rawUrl.startsWith('http') ? rawUrl : null;
}

// HLS/IVS playback via inline WebView HTML using hls.js (cached on jsdelivr).
// Native iOS/Safari WebViews play HLS natively; Android WebView needs hls.js shim.
function isHlsUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /\.m3u8(\?|$)/i.test(url) || /ivs\..*amazonaws\.com/i.test(url);
}

function hlsHtml(streamUrl: string): string {
  const esc = streamUrl.replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>html,body{margin:0;background:#000;height:100%}video{width:100%;height:100%;object-fit:contain;background:#000}</style>
</head><body>
<video id="v" autoplay playsinline controls muted></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<script>
(function(){
  var v=document.getElementById('v');
  var src="${esc}";
  if(v.canPlayType('application/vnd.apple.mpegurl')){
    v.src=src;
  } else if(window.Hls && Hls.isSupported()){
    var h=new Hls({lowLatencyMode:true,liveSyncDuration:2});
    h.loadSource(src); h.attachMedia(v);
  } else {
    document.body.innerHTML='<div style="color:#fff;padding:20px;font-family:sans-serif">HLS unsupported on this device. <a style="color:#fb923c" href="'+src+'">Open stream</a></div>';
  }
  setTimeout(function(){v.muted=false;v.play().catch(function(){});},800);
})();
</script>
</body></html>`;
}

export default function DarshanPlayerScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    url?: string;
    title?: string;
    deity?: string;
  }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const passedUrl = typeof params.url === 'string' ? params.url : undefined;
  const passedTitle = typeof params.title === 'string' ? params.title : undefined;

  const passedDeity = typeof params.deity === 'string' ? params.deity : undefined;

  // PAR-05. Two bugs stacked here.
  //   1. API_ENDPOINTS.DARSHAN_STREAM omitted the `/stream` suffix, so this
  //      query 404'd on every single call — and `refetchInterval: 15_000` kept
  //      re-requesting the 404 four times a minute for as long as the screen
  //      was open. The constant is fixed; the hook now also sets retry:false.
  //   2. The response is FLAT: {streamId, templeName, status, playbackUrl, …}.
  //      The player read `data.data.streamUrl` and `data.data.temple.deity`,
  //      neither of which exists, so `liveUrl` was always undefined and every
  //      temple rendered "Stream player not available".
  const stream = useDarshanStream(id, { enabled: !!id });
  const data = selectStreamDetail(stream.data);

  // PAR-21. This screen used to prefer `passedUrl` — a value the LIST screen
  // captured at router.push time — over the detail response, and to raise a LIVE
  // badge from `!!passedUrl`. Both are now decided by one pure resolver, which
  // treats GET /darshan/:id/stream as authoritative and demotes the route
  // parameter to a warm-start hint. Rationale in lib/stream-authority.ts.
  const view = resolveStreamPlayback({
    detail: data,
    passedUrl,
    detailPending: stream.isLoading && !stream.isError,
  });
  const liveUrl = view.playbackUrl;
  const title = passedTitle ?? data?.templeName ?? 'Live Darshan';
  const subtitle = passedDeity ?? '';
  const viewers = typeof data?.viewerCount === 'number' ? data.viewerCount : undefined;
  const isLive = view.isLive;
  const streamMissing = stream.isError || (!stream.isLoading && data === null);

  const embedUrl = youtubeEmbedUrl(liveUrl);
  const hlsMode = isHlsUrl(liveUrl);
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await stream.refetch();
    setRefreshing(false);
  }

  function openExternal() {
    if (!liveUrl) {
      Alert.alert('Stream unavailable', 'No public stream URL for this temple yet.');
      return;
    }
    Linking.openURL(liveUrl).catch(() => Alert.alert('Cannot open', liveUrl));
  }

  function onSave() {
    setSaved((s) => !s);
  }

  async function onShare() {
    const shareUrl = id
      ? `https://darshya.online/darshan/${encodeURIComponent(id)}?utm_source=mobile-app&utm_medium=share`
      : 'https://darshya.online/darshan?utm_source=mobile-app&utm_medium=share';
    try {
      await Share.share({
        title,
        message: `${title} — Live Darshan on Darshya\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // user cancel — silent
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View
          style={[
            styles.liveBadge,
            view.badge === 'OFFLINE' && styles.offlineBadge,
            view.badge === 'CHECKING' && styles.checkingBadge,
          ]}
        >
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{view.badge}</Text>
        </View>
      </View>

      <View style={styles.player}>
        {stream.isLoading && !data ? (
          <ActivityIndicator color={colors.white} size="large" />
        ) : hlsMode && liveUrl && WebViewComp ? (
          <WebViewComp
            source={{ html: hlsHtml(liveUrl), baseUrl: 'https://darshya.online' }}
            style={styles.webview}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={['*']}
          />
        ) : embedUrl && WebViewComp ? (
          <WebViewComp
            source={{ uri: embedUrl }}
            style={styles.webview}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
          />
        ) : (
          <View style={styles.fallback}>
            <Ionicons name="videocam-off" size={56} color={colors.saffron[300]} />
            <Text style={styles.fallbackTitle}>
              {streamMissing
                ? 'Stream unavailable'
                : liveUrl
                  ? 'In-app player unavailable'
                  : 'No stream right now'}
            </Text>
            <Text style={styles.fallbackText}>
              {streamMissing
                ? 'This temple has no stream we can play at the moment. Pull down to retry.'
                : liveUrl
                  ? 'The video component is missing from this build. Open it in your browser instead.'
                  : 'This temple is not broadcasting right now. Check the aarti timings and come back.'}
            </Text>
            {liveUrl ? (
              <TouchableOpacity style={styles.openBtn} onPress={openExternal} activeOpacity={0.85}>
                <Ionicons name="open-outline" size={18} color={colors.white} />
                <Text style={styles.openBtnText}>Open in browser</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsRow}>
          {typeof viewers === 'number' ? (
            <View style={styles.statChip}>
              <Ionicons name="people" size={14} color={colors.stone[600]} />
              <Text style={styles.statText}>{viewers.toLocaleString()} watching</Text>
            </View>
          ) : null}
          {/* The aarti window the authoritative endpoint reports. Nothing is
              rendered when it reports none — the chip that used to sit here
              claimed "24x7 darshan" for every temple, which no endpoint says. */}
          {view.slotLabel ? (
            <View style={styles.statChip}>
              <Ionicons name="time-outline" size={14} color={colors.stone[600]} />
              <Text style={styles.statText}>{view.slotLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={onSave}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={colors.saffron[600]} />
            <Text style={styles.actionText}>{saved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={onShare}>
            <Ionicons name="share-social-outline" size={20} color={colors.saffron[600]} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(devotee)/donations' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="gift-outline" size={20} color={colors.saffron[600]} />
            <Text style={styles.actionText}>Donate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutHeading}>About this stream</Text>
          <Text style={styles.aboutText}>
            Live darshan lets you join aarti and sankalp from anywhere. Streams
            follow each temple&apos;s published aarti timings.
          </Text>
          {data ? (
            <Text style={styles.aboutMeta}>
              {data.templeName ? `${data.templeName} · ` : ''}status: {data.status}
              {data.startedAt ? ` · since ${data.startedAt.slice(11, 16)} UTC` : ''}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 18,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.red[600], paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  offlineBadge: { backgroundColor: colors.stone[500] },
  checkingBadge: { backgroundColor: colors.stone[400] },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  liveText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  player: {
    width: '100%', aspectRatio: 16 / 9,
    backgroundColor: '#000', alignItems: 'center', justifyContent: 'center',
  },
  webview: { width: '100%', height: '100%', backgroundColor: '#000' },
  fallback: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
    width: '100%',
  },
  fallbackTitle: {
    fontSize: fontSize.lg, fontWeight: '700', color: colors.white,
    marginTop: spacing.md,
  },
  fallbackText: {
    fontSize: fontSize.sm, color: colors.stone[300], marginTop: spacing.xs,
    textAlign: 'center',
  },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.saffron[600], borderRadius: borderRadius.md,
  },
  openBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  body: { flex: 1 },
  bodyContent: { padding: spacing.md, gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: colors.white, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.stone[200],
  },
  statText: { fontSize: fontSize.xs, color: colors.stone[700], fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  actionBtn: { alignItems: 'center', gap: 4, padding: spacing.sm },
  actionText: { fontSize: fontSize.xs, color: colors.stone[700], fontWeight: '600' },
  aboutCard: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[100],
  },
  aboutHeading: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  aboutText: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: spacing.xs, lineHeight: 20 },
  aboutMeta: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: spacing.xs },
});
