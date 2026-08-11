# apps\mobile\app\(devotee)\wellness.tsx

- WellnessTab · type · L20-L20 — type WellnessTab = 'yoga' | 'meditation' | 'ayurveda';
- YogaSession · interface · L22-L31 — interface YogaSession
- MeditationTrack · interface · L33-L40 — interface MeditationTrack
- AyurvedaTip · interface · L42-L48 — interface AyurvedaTip
- YogaContent · function · L179-L263 — function YogaContent({ sessions, refreshing, onRefresh, }: { sessions: YogaSession[]; refreshing: boolean; onRefresh: () => void; })
- MeditationContent · function · L265-L333 — function MeditationContent({ playingId, setPlayingId }: { playingId: string | null; setPlayingId: (id: string | null) => void })
- AyurvedaContent · function · L335-L374 — function AyurvedaContent()
- mapWellnessLevel · function · L376-L381 — function mapWellnessLevel(level?: string): YogaSession['level']
- WellnessScreen · function · L383-L454 — function WellnessScreen()
- onRefresh · function · L406-L410 — async function onRefresh()
