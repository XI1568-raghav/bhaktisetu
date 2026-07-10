import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useContent } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

type ContentType = 'aarti' | 'chalisa' | 'mantra' | 'bhajan';

interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  deity: string;
  duration: string;
  isAudio: boolean;
}

const tabs: { key: ContentType; label: string }[] = [
  { key: 'aarti', label: 'Aarti' },
  { key: 'chalisa', label: 'Chalisa' },
  { key: 'mantra', label: 'Mantra' },
  { key: 'bhajan', label: 'Bhajan' },
];

const contentData: ContentItem[] = [
  {
    id: '1',
    title: 'Om Jai Jagdish Hare',
    type: 'aarti',
    deity: 'Lord Vishnu',
    duration: '5:42',
    isAudio: true,
  },
  {
    id: '2',
    title: 'Ganga Aarti',
    type: 'aarti',
    deity: 'Maa Ganga',
    duration: '8:15',
    isAudio: true,
  },
  {
    id: '3',
    title: 'Hanuman Chalisa',
    type: 'chalisa',
    deity: 'Lord Hanuman',
    duration: '9:30',
    isAudio: true,
  },
  {
    id: '4',
    title: 'Shiv Chalisa',
    type: 'chalisa',
    deity: 'Lord Shiva',
    duration: '11:20',
    isAudio: true,
  },
  {
    id: '5',
    title: 'Gayatri Mantra (108 times)',
    type: 'mantra',
    deity: 'Goddess Gayatri',
    duration: '32:00',
    isAudio: true,
  },
  {
    id: '6',
    title: 'Mahamrityunjaya Mantra',
    type: 'mantra',
    deity: 'Lord Shiva',
    duration: '28:45',
    isAudio: true,
  },
  {
    id: '7',
    title: 'Om Namah Shivaya (chant)',
    type: 'mantra',
    deity: 'Lord Shiva',
    duration: '15:00',
    isAudio: true,
  },
  {
    id: '8',
    title: 'Achyutam Keshavam',
    type: 'bhajan',
    deity: 'Lord Krishna',
    duration: '6:12',
    isAudio: true,
  },
  {
    id: '9',
    title: 'Shri Ram Chandra Kripalu',
    type: 'bhajan',
    deity: 'Lord Rama',
    duration: '7:45',
    isAudio: true,
  },
  {
    id: '10',
    title: 'Jai Ambe Gauri',
    type: 'aarti',
    deity: 'Goddess Durga',
    duration: '4:30',
    isAudio: true,
  },
];

const typeColors: Record<ContentType, string> = {
  aarti: colors.saffron[600],
  chalisa: colors.amber[500],
  mantra: colors.green[600],
  bhajan: colors.stone[600],
};

const typeIcons: Record<ContentType, React.ComponentProps<typeof Ionicons>['name']> = {
  aarti: 'flame',
  chalisa: 'book',
  mantra: 'pulse',
  bhajan: 'musical-notes',
};

const ContentItemRow = React.memo(function ContentItemRow({
  item,
  isPlaying,
  onPress,
}: {
  item: ContentItem;
  isPlaying: boolean;
  onPress: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.contentRow, isPlaying && styles.contentRowActive]}
      activeOpacity={0.7}
      onPress={() => onPress(item.id)}
    >
      {/* Icon */}
      <View
        style={[
          styles.contentIcon,
          { backgroundColor: isPlaying ? colors.saffron[600] : colors.stone[100] },
        ]}
      >
        {isPlaying ? (
          <Ionicons name="pause" size={18} color={colors.white} />
        ) : (
          <Ionicons
            name={typeIcons[item.type]}
            size={18}
            color={typeColors[item.type]}
          />
        )}
      </View>

      {/* Info */}
      <View style={styles.contentInfo}>
        <Text
          style={[
            styles.contentTitle,
            isPlaying && styles.contentTitleActive,
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <View style={styles.contentMeta}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: `${typeColors[item.type]}18` },
            ]}
          >
            <Text
              style={[styles.typeBadgeText, { color: typeColors[item.type] }]}
            >
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
          <Text style={styles.contentDeity}>{item.deity}</Text>
        </View>
      </View>

      {/* Duration & Play */}
      <View style={styles.contentRight}>
        <Text style={styles.contentDuration}>{item.duration}</Text>
        {item.isAudio && (
          <TouchableOpacity
            style={[
              styles.playSmall,
              isPlaying && styles.playSmallActive,
            ]}
            onPress={() => onPress(item.id)}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={14}
              color={isPlaying ? colors.white : colors.saffron[600]}
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

function inferContentType(category?: string | null, title?: string | null): ContentType {
  const c = `${category ?? ''} ${title ?? ''}`.toLowerCase();
  if (c.includes('chalisa')) return 'chalisa';
  if (c.includes('mantra') || c.includes('chant')) return 'mantra';
  if (c.includes('bhajan')) return 'bhajan';
  return 'aarti';
}

export default function ContentScreen() {
  const [activeTab, setActiveTab] = useState<ContentType>('aarti');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const contentQuery = useContent();

  // Stable toggle so renderItem stays referentially equal across re-renders
  // (paired with React.memo on ContentItemRow → only the row whose isPlaying
  // changed re-renders).
  const handleTogglePlay = useCallback((id: string) => {
    setPlayingId((prev) => (prev === id ? null : id));
  }, []);
  const [refreshing, setRefreshing] = useState(false);

  const apiContent = contentQuery.data?.data ?? [];
  const sourceContent: ContentItem[] = apiContent.length > 0
    ? apiContent.map((c, i) => {
        const fb = contentData[i % contentData.length]!;
        const t = inferContentType((c as any).category, c.title);
        return {
          id: c.id,
          title: c.title ?? fb.title,
          type: t,
          deity: (c as any).deity ?? fb.deity,
          duration: (c as any).duration ?? fb.duration,
          isAudio: true,
        };
      })
    : contentData;

  const filteredContent = sourceContent.filter((item) => item.type === activeTab);
  const playingItem = sourceContent.find((item) => item.id === playingId);

  async function onRefresh() {
    setRefreshing(true);
    await contentQuery.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spiritual Content</Text>
        <Text style={styles.headerSubtitle}>
          Aartis, chalisas, mantras and bhajans
        </Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentControl}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.segmentTab,
                  isActive && styles.segmentTabActive,
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={typeIcons[tab.key]}
                  size={14}
                  color={isActive ? colors.white : colors.stone[500]}
                />
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content List */}
      <FlatList
        data={filteredContent}
        keyExtractor={(item) => item.id}
        renderItem={useCallback(
          ({ item }: { item: ContentItem }) => (
            <ContentItemRow
              item={item}
              isPlaying={playingId === item.id}
              onPress={handleTogglePlay}
            />
          ),
          [playingId, handleTogglePlay]
        )}
        contentContainerStyle={[
          styles.listContent,
          playingItem ? { paddingBottom: 100 } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={typeIcons[activeTab]}
              size={48}
              color={colors.stone[300]}
            />
            <Text style={styles.emptyText}>
              No {activeTab} content yet
            </Text>
          </View>
        }
      />

      {/* Mini Player */}
      {playingItem && (
        <View style={styles.miniPlayer}>
          <View style={styles.miniPlayerProgress} />
          <View style={styles.miniPlayerContent}>
            <View style={styles.miniPlayerIcon}>
              <Ionicons
                name={typeIcons[playingItem.type]}
                size={18}
                color={colors.white}
              />
            </View>
            <View style={styles.miniPlayerInfo}>
              <Text style={styles.miniPlayerTitle} numberOfLines={1}>
                {playingItem.title}
              </Text>
              <Text style={styles.miniPlayerDeity}>
                {playingItem.deity}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.miniPlayerButton}
              onPress={() => setPlayingId(null)}
            >
              <Ionicons name="pause" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.miniPlayerClose}
              onPress={() => setPlayingId(null)}
            >
              <Ionicons name="close" size={18} color={colors.stone[400]} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.stone[900],
  },
  headerSubtitle: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    marginTop: 2,
  },
  // Segmented Control
  segmentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: colors.stone[100],
    borderRadius: borderRadius.md,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  segmentTabActive: {
    backgroundColor: colors.saffron[600],
    shadowColor: colors.saffron[700],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[500],
  },
  segmentTextActive: {
    color: colors.white,
  },
  // List
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  // Content Row
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  contentRowActive: {
    borderColor: colors.saffron[200],
    backgroundColor: colors.saffron[50],
  },
  contentIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[900],
    marginBottom: 4,
  },
  contentTitleActive: {
    color: colors.saffron[700],
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  contentDeity: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
  },
  contentRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  contentDuration: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    fontWeight: '500',
  },
  playSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.saffron[600],
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 1,
  },
  playSmallActive: {
    backgroundColor: colors.saffron[600],
    borderColor: colors.saffron[600],
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.stone[400],
    fontWeight: '500',
  },
  // Mini Player
  miniPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.stone[900],
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  miniPlayerProgress: {
    height: 3,
    width: '45%',
    backgroundColor: colors.saffron[500],
  },
  miniPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  miniPlayerIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.saffron[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerInfo: {
    flex: 1,
  },
  miniPlayerTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
  miniPlayerDeity: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    marginTop: 1,
  },
  miniPlayerButton: {
    padding: spacing.xs,
  },
  miniPlayerClose: {
    padding: spacing.xs,
  },
});
