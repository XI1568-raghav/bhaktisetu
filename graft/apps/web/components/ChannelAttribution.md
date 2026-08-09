# apps\web\components\ChannelAttribution.tsx

- Attribution · type · L33-L42 — type Attribution = { signup_channel?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string; ref?: string; first_touch_at?: string; };
- readStored · function · L44-L52 — function readStored(): Attribution | null
- writeStored · function · L54-L61 — function writeStored(attr: Attribution): void
- deriveChannelFromRef · function · L63-L69 — function deriveChannelFromRef(ref: string | null): string | null
- normalizeUtmSource · function · L71-L75 — function normalizeUtmSource(src: string | null): string | null
- pickString · function · L77-L81 — function pickString(value: string | null, maxLen: number): string | undefined
- ChannelAttribution · function · L83-L142 — function ChannelAttribution(): null
