# apps\web\lib\dashavatar.ts

- AvatarYuga · type · L1-L1 — type AvatarYuga = 'satya' | 'treta' | 'dvapara' | 'kali' | 'future-kali';
- Avatar · type · L13-L31 — type Avatar = { number: number; slug: string; name: string; sanskrit: string; iast: string; yuga: AvatarYuga; form: string; purpose: string; demonOrThreat: string; weapons: string[]; consort?: string; associatedTirthas: string[]; storySummary: string; keyTeaching: string; principalScripture: string; modernRelevance: string; bestKnownFor: string; };
- avatarSlugs · function · L220-L222 — function avatarSlugs(): string[]
- getAvatar · function · L224-L226 — function getAvatar(slug: string): Avatar | undefined
