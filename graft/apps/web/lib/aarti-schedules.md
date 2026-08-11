# apps\web\lib\aarti-schedules.ts

- AartiSlot · interface · L16-L21 — interface AartiSlot
- TempleAartiSchedule · interface · L23-L27 — interface TempleAartiSchedule
- mkSlot · function · L29-L34 — function mkSlot(time: string, event: string, durationMin = 60): AartiSlot
- getScheduleForTemple · function · L151-L153 — function getScheduleForTemple(slug: string): TempleAartiSchedule | null
- nowMinutesIST · function · L159-L170 — function nowMinutesIST(now: Date = new Date()): number
- AartiNowState · interface · L172-L178 — interface AartiNowState
- currentAartiState · function · L185-L208 — function currentAartiState(slug: string, now: Date = new Date()): AartiNowState | null
- nextAartiLabel · function · L213-L219 — function nextAartiLabel(state: AartiNowState): string
