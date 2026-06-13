# /rashi + /nakshatra Deepening — Content + Schema Expansion

> Existing /rashi (12 zodiac) + /nakshatra (27 lunar mansions) pages get 4-section depth. SEO uplift.

## Goal

Deepen 12 rashi + 27 nakshatra pages from current 200-word summaries to 2000-word comprehensive guides. Boost organic traffic + dwell time.

## Per-rashi 5-section template

### Section 1: Vedic-classical description (300 words)
- Sanskrit name + meaning
- Element + quality (movable/fixed/dual)
- Ruling planet + nakshatra correspondence
- Body part rulership (per Vedic ayurveda)
- Mental + emotional traits
- Compatible / incompatible signs

### Section 2: Famous natives (200 words, 8-10 entries)
- Historical figures born under this rashi
- Contemporary celebrities + their alignment
- Career patterns + life trajectories
- Real-world validation of Vedic descriptions

### Section 3: Recommended pujas + remedies (400 words)
- Specific pujas for this rashi (e.g., Aries → Mangal-related; Cancer → Chandra-related)
- Recommended fasting days (Sade Sati relief if applicable)
- Mantras specific to ruling planet
- Recommended donations + charity types

### Section 4: 2026 predictions (year ahead, 500 words)
- Major transits affecting this rashi in 2026
- Career predictions + warning periods
- Health considerations
- Relationship + marriage windows
- Auspicious months for major decisions

### Section 5: Compatibility matrix (400 words)
- Best matches (top 3)
- Friendly (4-7 of 12 rashis)
- Challenging (3-5 of 12 rashis)
- Best matches for marriage / business / friendship
- Real Vedic Ashtakoot points

### Bonus: 7-Day weekday rotation + ritual (200 words)
- Mon-Sun specific rituals for this rashi
- Daily mantra recommendation
- Weekly cycle wisdom

## Per-nakshatra 4-section template

### Section 1: Vedic background (300 words)
- Sanskrit name + meaning
- Ruling planet + deity
- Pada-level subdivisions (4 padas)
- Lunar mansion characteristics
- Compatible / incompatible nakshatras

### Section 2: Births under this nakshatra (200 words)
- Famous personalities born here
- Career patterns + life trajectories
- Marriage compatibility patterns

### Section 3: Vedic remedies (400 words)
- Mantras specific to nakshatra
- Fasting days
- Donation recommendations
- Astrological remedies (specific gems, colours)

### Section 4: Modern significance (300 words)
- Best activities to begin under this nakshatra
- Best timing for life-cycle ceremonies
- Career field affinities (per Brihad Parashara)
- Spiritual sadhana recommendations

## Implementation

### File 1: Extend `apps/web/lib/rashis.ts`

Add deep content per rashi:

```typescript
export interface RashiDeepContent extends RashiInfo {
  vedicDescription: string[] // 5 paragraphs
  famousNatives: { name: string; profession: string }[]
  pujasRemedies: string[]
  yearAheadPredictions: string[]
  compatibilityMatrix: {
    bestMatches: string[] // top 3
    friendly: string[] // 4-7
    challenging: string[] // 3-5
    marriageBest: string[]
    businessBest: string[]
  }
  weekdayRotation: { day: string; ritual: string }[]
}
```

### File 2: Similar pattern for `apps/web/lib/nakshatras.ts`

### File 3: Render in detail page

```typescript
// apps/web/app/rashi/[slug]/page.tsx
import { getRashiDeep } from '@/lib/rashis-deep'

export default async function RashiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const rashi = getRashiDeep(slug)
  
  if (!rashi) return notFound()
  
  return (
    <main>
      <h1>{rashi.name} ({rashi.sanskrit})</h1>
      <p className="lead">{rashi.element} • {rashi.quality} • Ruled by {rashi.lord}</p>
      
      <Section title="Vedic Description">
        {rashi.vedicDescription.map((para, i) => <p key={i}>{para}</p>)}
      </Section>
      
      <Section title="Famous Natives">
        {rashi.famousNatives.map(n => (
          <div key={n.name}><strong>{n.name}</strong> — {n.profession}</div>
        ))}
      </Section>
      
      <Section title="Recommended Pujas + Remedies">
        {rashi.pujasRemedies.map((item, i) => <p key={i}>{item}</p>)}
      </Section>
      
      <Section title="2026 Year Ahead">
        {rashi.yearAheadPredictions.map((p, i) => <p key={i}>{p}</p>)}
      </Section>
      
      <Section title="Compatibility Matrix">
        <h3>Best Matches</h3>
        <ul>{rashi.compatibilityMatrix.bestMatches.map(m => <li key={m}>{m}</li>)}</ul>
        <h3>Friendly</h3>
        <ul>{rashi.compatibilityMatrix.friendly.map(m => <li key={m}>{m}</li>)}</ul>
        <h3>Challenging</h3>
        <ul>{rashi.compatibilityMatrix.challenging.map(m => <li key={m}>{m}</li>)}</ul>
      </Section>
      
      <Section title="Weekly Ritual Calendar">
        {rashi.weekdayRotation.map(d => (
          <div key={d.day}><strong>{d.day}</strong>: {d.ritual}</div>
        ))}
      </Section>
      
      {/* Schema.org Article + Question + Answer */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({...}) }} />
    </main>
  )
}
```

## SEO impact

- Word count per rashi: 300 → 2000 (6.6x depth)
- Internal links per page: 5 → 25
- Schema additions: 1 → 4 types
- Expected dwell time uplift: 1min → 4min
- Expected organic traffic uplift: 80-150% per rashi

## Total content investment

- 12 rashis × 2000 words = 24,000 words
- 27 nakshatras × 1500 words = 40,500 words
- Total: ~64,500 words
- Production: 3 weeks (founder + content contractor)
- Cost: ₹50K-1L for content writer (vs founder time)

## Verification

- Lighthouse SEO score per rashi page: +10 points
- PostHog dwell time tracking per page
- Google Search Console rank position monthly
- Internal link audit via Screaming Frog

## Phased rollout

- Phase 1 (Q2 W12): Top 5 rashis (Aries, Cancer, Leo, Scorpio, Pisces — highest search)
- Phase 2 (Q3 W4): Next 5 rashis
- Phase 3 (Q3 W8): Last 2 rashis + all 27 nakshatras

## Next-tier content

After /rashi + /nakshatra deep-polish, similar pattern for:
- /dasha (Mahadasha + Antardasha + Pratyantardasha details)
- /muhurat (extended 2026 + 2027 calendar)
- /panchang (city-specific + daily detailed)
- /ekadashi (per-Ekadashi 1500-word guides for all 24 annual occurrences)
