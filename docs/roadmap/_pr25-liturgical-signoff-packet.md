# PR #25 — Liturgical Signoff Packet

**For founder review. <10 min read. Decide YES / NO / FIX-LINE per claim.**

PR: https://github.com/XI1568-raghav/bhaktisetu/pull/25
Branch: `cmo/R-Q3-M-014-batch-2026-06-13`
Risk: 10 SEO landing pages with dharmic claims. One wrong claim = brand-trust event.

Triage flagged 4 specific high-risk dharmic claims to verify. They are reproduced verbatim below. Mark ✅ / ❌ / EDIT against each. After signoff, run merge command at bottom.

---

## CLAIM 1 — Mahakaleshwar Bhasma Aarti (Ujjain)

**Source file:** `apps/web/lib/city-pujas.ts` L362-407

> Mahakaleshwar at Ujjain is one of the 12 Jyotirlingas and is **uniquely the only Shivling that faces south (Dakshinamukhi).** The pre-dawn Bhasma Aarti — where consecrated ash is offered to the Lord — is performed **only at this Jyotirlinga.**

> **Scriptural basis:** Shiva Purana, Vidyeshwara Samhita. The Bhasma Aarti tradition is described in the Ujjayini Mahatmyam.

> **Timing:** Bhasma Aarti is performed daily at 4:00 AM (Brahma Muhurat).

> Brahma Muhurat (~96 minutes before sunrise) is considered the most spiritually potent window. Mahakaleshwar Bhasma Aarti is uniquely performed at this hour as per Vidyeshwara Samhita.

**Specific factual claims to verify:**
- [ ] Mahakaleshwar Shivling faces south (Dakshinamukhi) — only one of 12 Jyotirlingas to do so
- [ ] Bhasma Aarti tradition is unique to Mahakaleshwar
- [ ] Timing 4:00 AM daily (Brahma Muhurat)
- [ ] Citation: Shiva Purana, Vidyeshwara Samhita / Ujjayini Mahatmyam
- [ ] Dress code: men dhoti + sovala (no shirt); women traditional saree

Founder decision: ☐ ✅ AS-IS  ☐ ❌ REJECT  ☐ EDIT: ______________________

---

## CLAIM 2 — Ganga Aarti, Har-ki-Pauri (Haridwar)

**Source file:** `apps/web/lib/city-pujas.ts` L304-358

> Har-ki-Pauri (literally **"footstep of Hari/Vishnu"**) is the most sacred bathing ghat on the Ganga in Haridwar. The evening Ganga Aarti is performed at sunset daily and is one of India's most witnessed religious ceremonies.

> **Scriptural basis:** Ganga Stotram by Adi Shankaracharya, Ganga Sahasranama. **The Ganga Aarti tradition at Har-ki-Pauri dates to the early 20th century in its current form.**

> Evening aarti slot timings vary seasonally — approximately 6:00 PM (winter) to 7:00 PM (summer). Sponsorship slot is confirmed 48 hours in advance based on the **Brahma Kshetra Panch Puri Akhada Parishad** calendar.

**Specific factual claims to verify:**
- [ ] Har-ki-Pauri = "footstep of Hari/Vishnu" etymology
- [ ] Ganga Aarti at Har-ki-Pauri "current form dates to early 20th century"
- [ ] Slot governance via "Brahma Kshetra Panch Puri Akhada Parishad"
- [ ] Citation: Ganga Stotram by Adi Shankaracharya
- [ ] Timings: ~6 PM winter / ~7 PM summer

Founder decision: ☐ ✅ AS-IS  ☐ ❌ REJECT  ☐ EDIT: ______________________

---

## CLAIM 3 — Rudrabhishek at Kashi Vishwanath (Varanasi)

**Source file:** `apps/web/lib/city-pujas.ts` L185-235

> Kashi Vishwanath is **one of the 12 Jyotirlingas** and the most sacred site in India for Shiva worship. A Rudrabhishek performed in Kashi is considered uniquely potent — **Kashyam maranan muktih** (release through death in Kashi) and Kashi-darshan are central to the Shaivite tradition.

> **Scriptural basis:** Rudra Suktam from the Krishna Yajurveda (Namakam-Chamakam, Sri Rudram). **Eleven recitations constitute a full Ekadasini Rudri.**

> **Samagri:** Panchamrit (milk, curd, ghee, honey, sugar) + Gangajal; Bilva patra (108 minimum), white flowers; Bhasma, vibhuti, chandan; Black tila (sesame), akshat (unbroken rice); **Dhatura, bhang (where permitted)**, kapur, agarbatti.

> **Faq:** Sankalp is taken inside the sanctum where permitted by temple administration. Full abhishek is performed at an authorized altar nearby.

**Specific factual claims to verify:**
- [ ] "Kashyam maranan muktih" — Sanskrit phrasing correct
- [ ] Rudra Suktam from Krishna Yajurveda (Namakam-Chamakam, Sri Rudram)
- [ ] Ekadasini Rudri = 11 recitations
- [ ] Bilva patra 108 minimum (one full Rudri)
- [ ] Samagri list includes dhatura + bhang "where permitted" — OK to publish? (regulated under NDPS Act in some jurisdictions)

Founder decision: ☐ ✅ AS-IS  ☐ ❌ REJECT  ☐ EDIT: ______________________

---

## CLAIM 4 — All 10 pages (general dharmic sanity)

Other shastric citations on the 10 pages — verify spot-check 2-3:

| Page | Citation claim |
|---|---|
| Satyanarayan (Bengaluru/Delhi) | Skanda Purana, Reva Khanda — "Five chapters describe merit of truthful worship of Vishnu as Satyanarayan" |
| Griha Pravesh (Mumbai) | Matsya Purana + Brihat Samhita |
| Venkateswara (Tirupati) | Venkatachala Mahatmyam (Skanda Purana) + Suprabhatam by Prativadi Bhayankaram Annan |
| Ram Puja (Ayodhya) | Valmiki Ramayana + Ramcharitmanas + Ram Raksha Stotra (Budha Kaushika Rishi) |
| Krishna Puja (Vrindavan) | Bhagavata Purana (Dashama Skanda) + Brahma Samhita + Govinda Lilamrita + Chaitanya Charitamrita |
| Maha Mrityunjaya (Kashi) | Rigveda 7.59.12 (Tryambakam Yajamahe sukta), Sage Markandeya tradition |

Spot-check decision: ☐ ✅ ALL CITATIONS DEFENSIBLE  ☐ ❌ LIST CONCERNS: ______________________

---

## Other founder-action items on this PR (from triage)

| Item | Action |
|---|---|
| **hi-IN hreflang** | Layout ships en-IN / en-US / x-default only — no hi-IN. Add hi-IN later OR drop hreflang claim from PR title? ☐ ADD-LATER  ☐ DROP-CLAIM |
| **Hero images** | All 10 use `/og/default` placeholder. ☐ MERGE-AS-IS (Founder uploads post-merge)  ☐ HOLD until images shot |

---

## After signoff — merge command (paste into terminal)

```bash
cd E:/NewClaude/bhaktisetu
git fetch origin
git checkout main && git pull --rebase origin main
git checkout cmo/R-Q3-M-014-batch-2026-06-13
git rebase origin/main
# Resolve _ship-log + _index.json conflicts per std pattern (append-both, take-branch+regen)
git add -A && git -c core.editor=true rebase --continue
git push --force-with-lease origin cmo/R-Q3-M-014-batch-2026-06-13
gh pr merge 25 --repo XI1568-raghav/bhaktisetu --squash --delete-branch
```

**OR** reply `signoff #25` in chat and I will run the merge for you.

---

## If REJECT or EDIT — what changes

For any claim marked ❌ / EDIT, I will:
1. Patch `apps/web/lib/city-pujas.ts` per your edit
2. Re-run vitest invariants (`pnpm --filter @poojly/web test city-pujas`)
3. Push patch commit to the branch
4. Re-present for signoff
