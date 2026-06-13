# 2026-02 Deity-of-Day Cluster Batch Index

> Source: R-Q1-M-009. Status: ready-for-founder-review (brand voice).
> Generated: 2026-06-13 via `scripts/agents/generate-deity-cluster-drafts.mjs`
> Vaar map: follows `apps/web/app/today/page.tsx` DAY_DEITY (code, not spec).

## Vaar Devata Map Deltas vs Spec

| Day | Spec said | Code uses | Decision |
|---|---|---|---|
| Sunday | Hanuman | Surya (slug `vishnu`) | Follow code → Surya |
| Saturday | Santoshi Maa | Hanuman (shani-dosh remedy) | Follow code → Hanuman |

All other days match spec (Mon Shiva, Tue Hanuman, Wed Ganesha, Thu Vishnu, Fri Lakshmi).

## All 28 Drafts

| Week | Weekday | Deity | Slug | Target Keyword | Internal Links |
|---|---|---|---|---|---|
| W1 | Monday | Shiva | shiva-puja-monday-w1 | shiva monday puja | /deity/shiva, /pujas/rudrabhishek, /aarti/shiv-aarti |
| W1 | Tuesday | Hanuman | hanuman-puja-tuesday-w1 | hanuman tuesday puja | /deity/hanuman, /pujas/sundarkand-path, /aarti/hanuman-aarti |
| W1 | Wednesday | Ganesha | ganesha-puja-wednesday-w1 | ganesha wednesday puja | /deity/ganesha, /pujas/ganesh-puja, /aarti/ganesh-aarti |
| W1 | Thursday | Vishnu | vishnu-puja-thursday-w1 | vishnu thursday puja | /deity/vishnu, /pujas/satyanarayan-puja, /aarti/vishnu-aarti |
| W1 | Friday | Lakshmi | lakshmi-puja-friday-w1 | lakshmi friday puja | /deity/lakshmi, /pujas/lakshmi-puja, /aarti/lakshmi-aarti |
| W1 | Saturday | Hanuman | hanuman-puja-saturday-w1 | hanuman saturday puja | /deity/hanuman, /pujas/sundarkand-path, /aarti/hanuman-aarti |
| W1 | Sunday | Surya | surya-puja-sunday-w1 | surya sunday puja | /deity/vishnu, /pujas/surya-namaskar, /aarti/vishnu-aarti |
| W2 | Monday | Shiva | shiva-puja-monday-w2 | shiva monday puja | (same as W1, angle: Mahamrityunjaya) |
| W2 | Tuesday | Hanuman | hanuman-puja-tuesday-w2 | hanuman tuesday puja | (Sundarkand angle) |
| W2 | Wednesday | Ganesha | ganesha-puja-wednesday-w2 | ganesha wednesday puja | (Sankashti Chaturthi) |
| W2 | Thursday | Vishnu | vishnu-puja-thursday-w2 | vishnu thursday puja | (Satyanarayan Katha) |
| W2 | Friday | Lakshmi | lakshmi-puja-friday-w2 | lakshmi friday puja | (Mahalakshmi Vrat) |
| W2 | Saturday | Hanuman | hanuman-puja-saturday-w2 | hanuman saturday puja | (Hanuman Chalisa 7-paath) |
| W2 | Sunday | Surya | surya-puja-sunday-w2 | surya sunday puja | (Surya Namaskar) |
| W3 | Monday | Shiva | shiva-puja-monday-w3 | shiva monday puja | (Pradosh Vrat) |
| W3 | Tuesday | Hanuman | hanuman-puja-tuesday-w3 | hanuman tuesday puja | (Bajrang Baan) |
| W3 | Wednesday | Ganesha | ganesha-puja-wednesday-w3 | ganesha wednesday puja | (Ganesh Atharvashirsha) |
| W3 | Thursday | Vishnu | vishnu-puja-thursday-w3 | vishnu thursday puja | (Vishnu Sahasranama) |
| W3 | Friday | Lakshmi | lakshmi-puja-friday-w3 | lakshmi friday puja | (Sri Suktam) |
| W3 | Saturday | Hanuman | hanuman-puja-saturday-w3 | hanuman saturday puja | (Shani-Hanuman dual) |
| W3 | Sunday | Surya | surya-puja-sunday-w3 | surya sunday puja | (Aditya Hridayam) |
| W4 | Monday | Shiva | shiva-puja-monday-w4 | shiva monday puja | (Maha Shivratri prep) |
| W4 | Tuesday | Hanuman | hanuman-puja-tuesday-w4 | hanuman tuesday puja | (Mangaldosh remedy) |
| W4 | Wednesday | Ganesha | ganesha-puja-wednesday-w4 | ganesha wednesday puja | (Modak offering) |
| W4 | Thursday | Vishnu | vishnu-puja-thursday-w4 | vishnu thursday puja | (Brihaspati Guru) |
| W4 | Friday | Lakshmi | lakshmi-puja-friday-w4 | lakshmi friday puja | (Vaibhav Lakshmi Vrat) |
| W4 | Saturday | Hanuman | hanuman-puja-saturday-w4 | hanuman saturday puja | (Sankat Mochan stotra) |
| W4 | Sunday | Surya | surya-puja-sunday-w4 | surya sunday puja | (Surya Arghya) |

## Internal Link Audit

- /deity/ links: 28/28 ✓
- /pujas/ links: 28/28 ✓
- /aarti/ links: 28/28 ✓
- /today CTA: 28/28 ✓
- /nri CTA: 28/28 ✓
- Frontmatter validation: 113/113 vitest tests pass

## Founder Review Checklist

- [ ] Brand voice consistency (warm, scripture-grounded, NRI-aware)
- [ ] Scripture accuracy (Puranic references, mantra spellings, vidhi sequences)
- [ ] Pandit-verified factual claims (any vidhi step a real pandit would dispute?)
- [ ] Tone for NRI corner (does it feel inclusive without being condescending?)
- [ ] CTA placement (not too pushy, not too buried)

## Publish Path

After founder approves all 28:
1. Move each draft from `docs/agent-reports/blog-drafts/` to `apps/web/content/blog/`
2. Flip `status: ready-for-founder-review` → `status: published`
3. Add `published_at: <date>` field
4. Roadmap R-Q1-M-009 status → `shipped`, set `shipped_at`
