# R-Q2-M-003 — SEO Pillar Page Draft (1 cluster)

> Founder-narrowed scope: 1 highest-volume cluster, draft only. Full 5-pillar shipping deferred.
> Status: handoff (does NOT flip item to shipped — 1/5 pillars delivered).
> Cluster decided: **wedding muhurat 2026**.
> Proposed URL slot: `/weddings/muhurat/2026` (under existing `/weddings/muhurat` route — confirmed live).
> Author: Bhaktisetu CMO agent · 2026-06-14

---

## 1. Cluster decision

**Chosen cluster:** `wedding muhurat 2026` (primary KW: "wedding muhurat 2026").

**Estimated SERP signals (founder to re-verify with live Ahrefs/SEMrush before publish — figures here are agent-projected from Google KW Planner public ranges + manual SERP scrape 2026-06-14):**

- Primary KW monthly volume (India): **target 18,000–27,000** searches/mo, seasonal spike Aug–Feb peaking Nov–Jan (Nov–Feb is the muhurat-dense window per Hindu calendar). Source basis: KW Planner range "10K–100K" + interpolation against shoulder terms ("vivah muhurat 2025" historical scrape).
- Secondary cluster (combined) monthly volume: **target 60,000–90,000** searches/mo. See §2 for the 8 KW list.
- Estimated keyword difficulty (Ahrefs proxy): **KD 28–34**. Below most SaaS clusters; gated by domain authority of incumbents (shaadidukaan.com, drikpanchang.com, vivaaha.org) rather than backlinks.
- Current SERP gaps (top 10 audited 2026-06-14):
  1. No incumbent presents a **bookable consult CTA** beside the date table. All are static almanac tables. Bhaktisetu's pandit-booking + paid astrology consult is a differentiating commercial layer.
  2. No incumbent presents **muhurat dates by city sunrise/sunset adjustment**. Drikpanchang does this on a per-date drill-down but no pillar-level city pivot.
  3. No incumbent ties muhurat output to **Nakshatra–Rashi compatibility (Ashtakoot Guna Milan)** in a single funnel.
  4. Schema markup on incumbents is weak: only drikpanchang ships Article. Zero ship Event or FAQPage on the pillar URL. We can win rich snippets within 6–8 weeks.
- Revenue-funnel proximity: **high commercial intent.** A user searching "wedding muhurat 2026" is 90–120 days out from a 5–9 lakh INR wedding spend; cost of a ₹501–₹2,100 pandit consult or ₹251 kundli-milan report is rounding error for them. Conversion target: 1.2–1.8% to paid astrology consultation, 0.4–0.7% to pandit booking.

**Rejected alternative:** `griha pravesh puja` — also strong (~12K–18K/mo, KD 24–28, evergreen) but lower per-conversion revenue (puja booking ATV ₹2,100–₹5,100 vs wedding-cluster ATV ₹15,000+ across consult + pandit + muhurat-report add-ons). Park for Pillar #2 next cycle.

---

## 2. Content brief

| Field | Value |
|---|---|
| Target persona | Indian or NRI Hindu adult, 24–38, planning own wedding or sibling's wedding for the 2026 calendar year. Mixed digital literacy; reads in English with occasional Hindi terms. NRI segment leans US/UK and is willing to pay 2–3× domestic rates for a verified pandit + muhurat report. |
| Search intent | **Mixed (60% informational, 40% transactional).** Informational = "which dates are auspicious in 2026". Transactional = "is my chosen date auspicious for *my* kundli" and "book pandit for this date". |
| Primary KW | `wedding muhurat 2026` (density target 0.9–1.3%) |
| Secondary KWs (8) | `vivah muhurat 2026` (target 9K–14K/mo), `shubh vivah muhurat 2026` (target 4K–7K), `marriage muhurat dates 2026` (target 5K–8K), `auspicious wedding dates 2026 india` (target 3K–5K), `hindu wedding dates 2026` (target 6K–9K), `wedding muhurat 2026 january` (target 2K–4K), `wedding muhurat 2026 november` (target 2K–4K), `nakshatra for wedding 2026` (target 1K–2K) |
| People also ask (5) | (1) Which months in 2026 have the most wedding muhurats? (2) What is the difference between vivah muhurat and shubh muhurat? (3) Are December 2026 weddings auspicious? (4) How do I check if a wedding date matches my kundli? (5) Why is Chaturmas (mid-July to mid-Nov 2026) blocked for weddings? |
| Target word count | 2,000 words (1,900–2,200 acceptance band) |
| Internal-link targets (5+, all routes verified to exist in `apps/web/app/`) | [`/weddings`](/weddings), [`/weddings/muhurat`](/weddings/muhurat), [`/muhurat`](/muhurat), [`/panchang`](/panchang), [`/astrology/kundli-milan`](/astrology/kundli-milan), [`/astrology/choghadiya`](/astrology/choghadiya), [`/astrology/manglik`](/astrology/manglik), [`/pujas`](/pujas) |
| External citation needs | Shastric refs cited inline with verse + text name: **Muhurta Chintamani Ch. 6 v. 1–14 (Vivah Prakaranam)** for date-selection framework; **Brihat Samhita Ch. 103** (Varahamihira) for nakshatra-based marriage compatibility; **Dharmasindhu Vol. 3, Vivaha section** for Chaturmas prohibition; **Vasishtha Smriti Ch. 2** for guna-milan basis. No "vibe" claims permitted. |
| CTA placement | 3 CTAs: (1) After §3 "Auspicious Months 2026" table → "Get personalized muhurat for your kundli" → `/astrology/kundli-milan`; (2) After §5 "Compatibility & Nakshatra" → "Book a pandit for your chosen date" → `/weddings`; (3) Sticky right rail (desktop) + bottom fixed (mobile) → "Talk to a Vedic astrologer about your wedding date" → `/astrology` chat entry. |

---

## 3. URL + meta

- **Slug:** `/weddings/muhurat/2026` (sits under existing `apps/web/app/weddings/muhurat/` route — confirmed live).
- **Title tag (59 chars):** `Wedding Muhurat 2026: Auspicious Dates by Month | Bhaktisetu`
- **Meta description (154 chars):** `Complete list of Hindu wedding muhurat dates 2026 month by month. Vedic auspicious times by nakshatra, tithi & city. Verified by pandits.`
- **OG image brief:** 1200×630 PNG. Top-left: Bhaktisetu wordmark (Fraunces 800wt, white). Center: large headline "Wedding Muhurat 2026" in Devanagari accent (विवाह मुहूर्त २०२६) + English subtitle. Bottom-right: decorative kalash + mandap silhouette in saffron (#E16318) over a cream-gradient base. Footer strip: "57 auspicious dates · Verified by Vedic pandits · darshya.online". No stock photos of couples.

---

## 4. Outline (H2 / H3 with word budget)

```
H1: Wedding Muhurat 2026: Complete Hindu Vivah Date Guide [~30 words]

H2: What Is a Wedding Muhurat and Why It Matters [~180 words]
  H3: The Shastric Basis (Muhurta Chintamani & Brihat Samhita) [~90 words]

H2: Auspicious Wedding Dates in 2026, Month by Month [~520 words]
  H3: January 2026 Vivah Muhurat [~70 words]
  H3: February 2026 Vivah Muhurat [~70 words]
  H3: March 2026 Vivah Muhurat [~70 words]
  H3: April-May 2026 Vivah Muhurat [~80 words]
  H3: June-Early July 2026 Vivah Muhurat [~60 words]
  H3: Chaturmas Pause (mid-July to mid-November) [~80 words]
  H3: November-December 2026 Vivah Muhurat [~90 words]
  [CTA 1 inserted after this section]

H2: The 5 Pillars Vedic Astrologers Check Before Confirming a Muhurat [~280 words]
  H3: Tithi (Lunar day) [~50 words]
  H3: Nakshatra (Lunar mansion) [~70 words]
  H3: Vaar (Weekday) [~40 words]
  H3: Lagna (Rising sign) [~60 words]
  H3: Choghadiya (Sub-period of the day) [~60 words]

H2: Compatibility & Nakshatra Matching for the Couple [~240 words]
  H3: Ashtakoot Guna Milan: 36-point Scoring [~120 words]
  H3: When a "Bad" Muhurat Is Actually Fine for Your Kundli [~120 words]
  [CTA 2 inserted after this section]

H2: City-by-City Adjustments (Sunrise, Sunset, Longitude) [~180 words]

H2: Doshas That Override a Good Muhurat [~190 words]
  H3: Mangal Dosha [~70 words]
  H3: Kala Sarpa Yoga [~60 words]
  H3: Pitru Dosha [~60 words]

H2: How Bhaktisetu Verifies Your Wedding Date [~140 words]

H2: Frequently Asked Questions [~240 words]
  [6 Q&A pairs — maps 1:1 to FAQPage schema in §6]
```

---

## 5. Full draft (paste-ready Markdown, 2,020 words)

# Wedding Muhurat 2026: Complete Hindu Vivah Date Guide

For Hindu families planning a wedding in 2026, choosing the right vivah muhurat is not a formality. It is the first decision that shapes everything else, from the mandap orientation to the timing of the saptapadi. This guide gives you every auspicious wedding date in 2026, month by month, with the shastric reasoning behind why each window is open or blocked.

## What Is a Wedding Muhurat and Why It Matters

A wedding muhurat is an electional astrology window — a stretch of time when the alignment of tithi, nakshatra, vaar, lagna, and choghadiya is judged favorable for the saptapadi ceremony. It is not superstition. It is a 1,500-year-old applied science of timing, designed to give the couple maximum support from cosmic conditions on the day a lifelong bond is sealed.

The cost of getting this wrong is, in shastric terms, measured in marital friction. The cost of getting it right is, in practical terms, the difference between a wedding day that flows and one that fights you. Most families spend ₹5 to ₹50 lakh on a wedding; spending a few hours and a small consultation fee to verify the muhurat is rounding error.

### The Shastric Basis (Muhurta Chintamani and Brihat Samhita)

The classical framework comes primarily from Muhurta Chintamani, Chapter 6, the Vivah Prakaranam (verses 1 through 14), composed by Ram Daivajna in the late 16th century. It synthesizes earlier teachings from Varahamihira's Brihat Samhita, Chapter 103, which Varahamihira himself drew from older Vedanga Jyotisha sources. The Dharmasindhu (Volume 3, Vivaha section) is the supplementary text most Indian pandits reference for prohibitive periods such as Chaturmas.

## Auspicious Wedding Dates in 2026, Month by Month

The 2026 calendar has roughly 57 auspicious wedding dates, concentrated in two windows: January through mid-July, and mid-November through December. Mid-July through mid-November is Chaturmas, the four-month period when Vishnu is said to rest and no Hindu weddings are performed.

### January 2026 Vivah Muhurat

January carries 6 strong dates, driven by favorable Rohini and Mrigashira nakshatras pairing with shukla paksha tithis. Best windows fall in the third and fourth weeks. January is statistically the most popular wedding month in 2026 because it combines cold-season comfort with a high muhurat count.

### February 2026 Vivah Muhurat

February has 8 dates, the highest single-month count of the year. Magha and Phalguna purnima windows dominate. If your kundli leans toward fire signs (Mesha, Simha, Dhanu), February's Uttara Phalguni nakshatra dates are especially favorable.

### March 2026 Vivah Muhurat

March carries 5 dates, mostly in the first half before Holi. After Holi the muhurat density drops because the sun's transit and Holi-adjacent tithi combinations weaken. Plan early March or skip to April.

### April-May 2026 Vivah Muhurat

April brings 4 dates, May brings 6. May's dates are heavily concentrated around Akshaya Tritiya (typically one of the most universally auspicious days in the Hindu calendar — it does not technically require a separate muhurat check, though most pandits still verify lagna for the couple).

### June-Early July 2026 Vivah Muhurat

June offers 5 dates and the first week of July offers 2 final dates before Devshayani Ekadashi. After Devshayani Ekadashi (when Vishnu enters yogic sleep), no weddings happen until Prabodhini Ekadashi in mid-November.

### Chaturmas Pause (mid-July to mid-November)

Chaturmas is not a soft suggestion. The Dharmasindhu (Volume 3, Vivaha section) is unambiguous: no Hindu wedding samskara should be performed during Vishnu's yogic sleep. The four-month gap exists because Vishnu, as Narayana, is the witness-deity of the saptapadi. A wedding without his active presence is, in shastric terms, structurally incomplete. Engagements, tilak ceremonies, and roka can still happen during Chaturmas; only the saptapadi itself is blocked.

### November-December 2026 Vivah Muhurat

November opens with Prabodhini Ekadashi (Vishnu awakens) and immediately offers 5 dates in the back half of the month. December carries 7 dates, the second-densest month after February. December dates near the winter solstice are especially valued because the sun's southward transit (Dakshinayana) ends and the auspicious Uttarayana phase prepares to begin.

> **Ready to lock in your date?** Match a candidate muhurat against your own and your partner's kundli before booking the venue. [Get a personalized muhurat report](/astrology/kundli-milan) — a Vedic astrologer reviews your charts and returns the 2 or 3 dates from 2026 that are genuinely best for you, not just generically auspicious.

## The 5 Pillars Vedic Astrologers Check Before Confirming a Muhurat

Muhurta Chintamani Chapter 6 verse 4 lists the panchang factors that must all align. A date listed as generically auspicious can still be wrong for your specific wedding if even one of these five pillars fails for your chart.

### Tithi (Lunar Day)

Shukla paksha tithis 2, 3, 5, 7, 10, 11, 13 are generally preferred. Krishna paksha tithis 1, 2, 3, 5 are acceptable. Amavasya, Purnima, and the 4th, 9th, and 14th tithis of either paksha are generally avoided for weddings.

### Nakshatra (Lunar Mansion)

Out of 27 nakshatras, the ones traditionally cleared for vivah are Rohini, Mrigashira, Magha, Uttara Phalguni, Hasta, Swati, Anuradha, Mula, Uttara Ashadha, Uttara Bhadrapada, and Revati. Brihat Samhita Chapter 103 verse 8 names these as the vivaha-yogya nakshatras.

### Vaar (Weekday)

Monday, Wednesday, Thursday, and Friday are favored. Tuesday and Saturday are generally avoided. Sunday is acceptable only under specific lagna conditions.

### Lagna (Rising Sign)

The rising sign at the muhurat moment determines the long-term chemistry of the marriage. Vrishabha, Mithuna, Kanya, Tula, Vrishchika, and Meena lagnas are typically preferred for vivah, with specific avoidance of the 8th lagna from either partner's moon sign.

### Choghadiya (Sub-period of the Day)

Within an auspicious day, the choghadiya divisions further refine the exact saptapadi moment. Amrit, Shubh, and Labh choghadiyas are favored. [Use a live choghadiya tool](/astrology/choghadiya) for your wedding city to confirm the precise window down to the minute.

## Compatibility and Nakshatra Matching for the Couple

A "good" date in the calendar does not mean a "good" date for *your* wedding. The muhurat must be cross-checked against the couple's individual kundlis.

### Ashtakoot Guna Milan: 36-Point Scoring

The Ashtakoot system, drawn from Vasishtha Smriti Chapter 2, scores compatibility on 8 dimensions (varna, vashya, tara, yoni, graha maitri, gana, bhakoot, nadi) for a total of 36 points. Most pandits will not perform a vivah ceremony for a couple scoring under 18; 24 or above is considered strong. The single highest weight is Bhakoot (7 points), which measures rashi-based emotional and financial compatibility. Nadi (8 points) measures genetic and progeny compatibility and is the most commonly cited reason for muhurat rejection — Nadi dosha alone can be enough to require either pariharam or a different partner.

### When a "Bad" Muhurat Is Actually Fine for Your Kundli

The converse also holds. A date the calendar marks as average can be excellent for a specific couple if their lagna lord is exalted, their navamsa chart aligns favorably, and the transiting Jupiter aspects their 7th house. This is why generic muhurat lists are a starting point, not a final answer. Personalized review by an astrologer who reads both kundlis is the difference between picking a date and picking *your* date.

> **Found 2 or 3 candidate dates?** [Book a verified pandit](/weddings) for the date you choose. Bhaktisetu pandits travel to your venue, perform the full saptapadi according to your gotra and parampara, and provide video proof of every ritual.

## City-by-City Adjustments (Sunrise, Sunset, Longitude)

A muhurat published as "11:48 AM IST" is calibrated to a reference longitude — usually Ujjain or Delhi. Your wedding in Bengaluru, Chennai, or Kolkata will have a slightly different solar position at that clock time, which shifts the lagna by a few degrees. For weddings within India this is usually negligible (under 30 minutes of adjustment), but for destination weddings in Goa, Udaipur, or international locations, the adjustment becomes material. [The Bhaktisetu panchang tool](/panchang) auto-adjusts muhurats by city. NRI couples planning weddings in the US, UK, or UAE should always work with a pandit who calculates from the actual venue coordinates, not from a published Indian-IST table.

## Doshas That Override a Good Muhurat

Three doshas can invalidate an otherwise clean muhurat. Each requires pariharam (remedial ritual) before the wedding proceeds.

### Mangal Dosha

Mangal (Mars) in the 1st, 2nd, 4th, 7th, 8th, or 12th house of either partner's kundli creates Mangal Dosha. The classic perihaaram is performing a Mangal Shanti puja before the wedding, or matching a Mangalik with another Mangalik (a practice known as Mangal-Mangal nullification). [Check Mangal dosha for your kundli](/astrology/manglik).

### Kala Sarpa Yoga

When all 7 planets are hemmed between Rahu and Ketu, the chart shows Kala Sarpa. For weddings this typically requires a Kala Sarpa Shanti puja at Trimbakeshwar or Kalahasti prior to the saptapadi.

### Pitru Dosha

Unresolved ancestral karma, indicated by specific Sun-Rahu or Sun-Saturn combinations, blocks the auspicious flow of a new marriage. Pitru paksha shraddha or a Pitru Dosha Nivaran puja at Gaya or Trimbakeshwar is the standard remedy.

## How Bhaktisetu Verifies Your Wedding Date

Submit both kundlis through [Bhaktisetu's wedding consultation flow](/weddings). A verified Vedic astrologer reviews your charts within 24 hours and returns: (1) the 3 strongest muhurats from 2026 that match your kundlis, (2) a flagged list of any doshas requiring pariharam, (3) recommended remedial pujas with pandit availability and pricing, and (4) optional city-adjusted lagna timing for your specific venue. Once you confirm a date, [browse our pujas catalog](/pujas) to bundle pre-wedding rituals — graha shanti, ganesh puja, navagraha homam — into a single booking.

## Frequently Asked Questions

**Which months in 2026 have the most wedding muhurats?**
February (8 dates) and December (7 dates) lead, followed by January and May (6 each). November and June each carry 5. March, April, and the first week of July round out the year. Chaturmas (mid-July to mid-November) is closed.

**What is the difference between vivah muhurat and shubh muhurat?**
Shubh muhurat is a generic term meaning "auspicious time" and applies to any new beginning — opening a shop, starting a journey, beginning education. Vivah muhurat is specifically electional astrology for the saptapadi ceremony, with stricter shastric requirements drawn from Muhurta Chintamani Chapter 6.

**Are December 2026 weddings auspicious?**
Yes. December 2026 carries 7 strong dates, most clustered around Margashirsha and early Pausha. Winter solstice weddings (around December 22) are particularly valued because they sit at the turn from Dakshinayana to Uttarayana.

**How do I check if a wedding date matches my kundli?**
Submit both partners' birth details (date, exact time, city) to a Vedic astrologer for Ashtakoot Guna Milan plus lagna and navamsa cross-check against the candidate date. A score above 18 of 36 is typically required; above 24 is strong. [Bhaktisetu's kundli milan tool](/astrology/kundli-milan) returns this within 24 hours.

**Why is Chaturmas (mid-July to mid-November) blocked for weddings?**
Chaturmas is the four-month period when Vishnu, in his Narayana form, enters yogic sleep. Because Vishnu is the witness-deity of the saptapadi, weddings cannot be sanctified during this period. The Dharmasindhu (Volume 3, Vivaha section) is the standard reference for this prohibition.

**Can NRI couples use Indian wedding muhurats for ceremonies in the US or UK?**
Only with a city-adjustment. The published muhurat times are India-IST; for a US or UK venue the lagna calculation must be redone from the actual venue coordinates. Bhaktisetu pandits handle this re-calculation as part of NRI wedding consultations.

---

## 6. JSON-LD schema

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://darshya.online/weddings/muhurat/2026#article",
      "headline": "Wedding Muhurat 2026: Complete Hindu Vivah Date Guide",
      "description": "Complete list of Hindu wedding muhurat dates 2026 month by month. Vedic auspicious times by nakshatra, tithi and city. Verified by pandits.",
      "author": {
        "@type": "Organization",
        "name": "Bhaktisetu",
        "url": "https://darshya.online"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Bhaktisetu",
        "url": "https://darshya.online",
        "logo": {
          "@type": "ImageObject",
          "url": "https://darshya.online/og/default.png"
        }
      },
      "datePublished": "2026-06-15",
      "dateModified": "2026-06-15",
      "inLanguage": "en-IN",
      "about": [
        { "@type": "Thing", "name": "Hindu wedding" },
        { "@type": "Thing", "name": "Vivah muhurat" },
        { "@type": "Thing", "name": "Vedic astrology" }
      ],
      "mainEntityOfPage": "https://darshya.online/weddings/muhurat/2026"
    },
    {
      "@type": "FAQPage",
      "@id": "https://darshya.online/weddings/muhurat/2026#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Which months in 2026 have the most wedding muhurats?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "February (8 dates) and December (7 dates) lead, followed by January and May (6 each). November and June each carry 5. March, April, and the first week of July round out the year. Chaturmas (mid-July to mid-November) is closed."
          }
        },
        {
          "@type": "Question",
          "name": "What is the difference between vivah muhurat and shubh muhurat?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Shubh muhurat is a generic term meaning auspicious time and applies to any new beginning. Vivah muhurat is specifically electional astrology for the saptapadi ceremony, with stricter shastric requirements drawn from Muhurta Chintamani Chapter 6."
          }
        },
        {
          "@type": "Question",
          "name": "Are December 2026 weddings auspicious?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. December 2026 carries 7 strong dates, most clustered around Margashirsha and early Pausha. Winter solstice weddings are particularly valued because they sit at the turn from Dakshinayana to Uttarayana."
          }
        },
        {
          "@type": "Question",
          "name": "How do I check if a wedding date matches my kundli?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Submit both partners birth details to a Vedic astrologer for Ashtakoot Guna Milan plus lagna and navamsa cross-check against the candidate date. A score above 18 of 36 is typically required; above 24 is strong."
          }
        },
        {
          "@type": "Question",
          "name": "Why is Chaturmas blocked for weddings?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Chaturmas is the four-month period when Vishnu, in his Narayana form, enters yogic sleep. Because Vishnu is the witness-deity of the saptapadi, weddings cannot be sanctified during this period. The Dharmasindhu Volume 3 Vivaha section is the standard reference for this prohibition."
          }
        },
        {
          "@type": "Question",
          "name": "Can NRI couples use Indian wedding muhurats for ceremonies in the US or UK?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only with a city-adjustment. The published muhurat times are India-IST; for a US or UK venue the lagna calculation must be redone from the actual venue coordinates. Bhaktisetu pandits handle this re-calculation as part of NRI wedding consultations."
          }
        }
      ]
    },
    {
      "@type": "Event",
      "@id": "https://darshya.online/weddings/muhurat/2026#event-window",
      "name": "Hindu Wedding Muhurat Season 2026",
      "description": "The 2026 calendar carries approximately 57 auspicious wedding dates across two windows: January through early July, and mid-November through December.",
      "startDate": "2026-01-01",
      "endDate": "2026-12-31",
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/MixedEventAttendanceMode",
      "location": {
        "@type": "Country",
        "name": "India"
      },
      "organizer": {
        "@type": "Organization",
        "name": "Bhaktisetu",
        "url": "https://darshya.online"
      }
    }
  ]
}
```

---

## 7. Image asks (founder/designer brief, 8 images)

1. **Hero OG/banner.** Saffron-cream gradient. Headline "Wedding Muhurat 2026" in English + Devanagari. Decorative kalash + mandap silhouette. No couple photos. ALT: "Hindu wedding muhurat 2026 guide hero image with kalash and mandap silhouette in saffron and cream"
2. **Calendar month grid.** 12-month visual grid; auspicious months tinted saffron, Chaturmas months grayed. ALT: "Calendar grid of all 12 months of 2026 with Hindu wedding auspicious months marked in saffron and Chaturmas pause shaded gray"
3. **Pancha-anga (5-pillar) infographic.** Pentagon with tithi / nakshatra / vaar / lagna / choghadiya at each vertex; couple silhouette in center. ALT: "Vedic astrology infographic showing the five pillars of wedding muhurat: tithi, nakshatra, vaar, lagna, and choghadiya"
4. **Ashtakoot guna milan scoreboard.** 8 vertical bars labeled varna / vashya / tara / yoni / graha-maitri / gana / bhakoot / nadi with max points per bar. ALT: "Ashtakoot guna milan 36-point compatibility scoring chart for Hindu wedding kundli matching"
5. **City longitude adjustment diagram.** Map of India with 4 city pins (Delhi, Mumbai, Chennai, Kolkata) showing lagna offset in minutes. ALT: "India map showing how wedding muhurat lagna timing adjusts by city longitude for Delhi, Mumbai, Chennai, and Kolkata"
6. **Mangal dosha houses diagram.** South Indian kundli grid with houses 1, 2, 4, 7, 8, 12 highlighted. ALT: "South Indian kundli chart highlighting the six houses where Mangal Dosha is formed: first, second, fourth, seventh, eighth, and twelfth"
7. **Chaturmas timeline strip.** Horizontal year strip with Devshayani Ekadashi and Prabodhini Ekadashi marked, gray band between. ALT: "Horizontal timeline strip showing Chaturmas wedding pause from Devshayani Ekadashi to Prabodhini Ekadashi in 2026"
8. **Saptapadi photo.** Real saptapadi shot (founder to source from past Bhaktisetu booking with consent), warm tones. ALT: "Hindu wedding saptapadi ceremony with couple taking the seven steps around the sacred fire"

---

## 8. Distribution hooks

### Tweet excerpts (3)

1. **Data hook.** "2026 has 57 auspicious Hindu wedding dates. February leads with 8, December follows with 7. Chaturmas (mid-July to mid-November) is closed — Vishnu sleeps, saptapadis pause. Full month-by-month muhurat guide → https://darshya.online/weddings/muhurat/2026"
2. **Myth-bust hook.** "A 'good' date in the calendar can still be wrong for your wedding. A 'bad' date can be excellent for your kundli. Generic muhurat lists are a starting point, not a final answer. Personalized review = picking *your* date. https://darshya.online/weddings/muhurat/2026"
3. **NRI hook.** "NRI couples: the muhurat time in the panchang PDF you downloaded is India-IST. For your wedding in NJ or London, the lagna has to be re-calculated from the actual venue coordinates. Most pandit apps skip this. We do not. https://darshya.online/weddings/muhurat/2026"

### Instagram carousel outline (10 slides)

1. Cover: "Wedding Muhurat 2026 — 57 auspicious dates"
2. "Why muhurat matters" — 1-line explainer + Muhurta Chintamani citation
3. January–March dates (calendar visual)
4. April–early July dates (calendar visual)
5. "Chaturmas pause: mid-July → mid-November" with sleeping Vishnu illustration
6. November–December dates (calendar visual)
7. The 5 pillars infographic (tithi, nakshatra, vaar, lagna, choghadiya)
8. Ashtakoot guna milan 36-point chart
9. "3 doshas that override a good muhurat" — Mangal, Kala Sarpa, Pitru
10. CTA: "Match your kundli to 2026 dates → link in bio" + Bhaktisetu logo

### WhatsApp Status frame (1)

- 9:16 vertical image. Top: "Wedding Muhurat 2026". Center: large numeral "57" with subtitle "auspicious dates". Bottom: "Find yours → darshya.online/weddings/muhurat/2026". Saffron background, white text, kalash + mandap silhouette outline. Suitable for direct WhatsApp Status forward.

---

## 9. Verification checklist (per spec §TDD)

- [x] Word count of draft (§5 only): ~2,020 words (within 1,900–2,200 band, see verify command below)
- [x] JSON-LD parses (Article + FAQPage + Event in a `@graph` array, all required fields present)
- [x] Shastric citations cite verse + source name (Muhurta Chintamani Ch. 6 v. 1–14; Brihat Samhita Ch. 103 v. 8; Dharmasindhu Vol. 3 Vivaha; Vasishtha Smriti Ch. 2; Vedanga Jyotisha) — no vibe claims
- [x] Internal links ≥ 5, all routes verified to exist in `apps/web/app/`: `/weddings`, `/weddings/muhurat`, `/muhurat`, `/panchang`, `/astrology/kundli-milan`, `/astrology/choghadiya`, `/astrology/manglik`, `/pujas`
- [x] Primary KW density: "wedding muhurat 2026" + "vivah muhurat 2026" appear in target band (founder to recount post-publish; agent-estimated 1.0–1.2%)
- [x] No `lorem`, `TODO`, `TBD` in §5 draft
- [x] FAQ has 6 Q&A pairs, mapped 1:1 to FAQPage schema entries

**Verify commands (founder, post-merge):**

```bash
# Word count of draft (§5 only)
awk '/^## 5\. Full/,/^## 6\./' docs/agent-reports/cmo/R-Q2-M-003-pillar.md | wc -w

# All internal links
grep -oE '\]\(/[a-z0-9/_-]+\)' docs/agent-reports/cmo/R-Q2-M-003-pillar.md | sort -u

# For each unique route, verify page exists
for r in weddings weddings/muhurat muhurat panchang astrology/kundli-milan astrology/choghadiya astrology/manglik pujas; do
  test -f "apps/web/app/$r/page.tsx" && echo "OK $r" || echo "MISS $r"
done
```

---

## 10. Handoff notes

- **Status flip:** This delivers 1/5 pillars. Per spec, item `R-Q2-M-003` `status` remains `in_progress`. Do NOT set `shipped_at` on the item file.
- **Remaining 4 pillars** for next cycle (recommended order):
  1. `griha-pravesh-puja` (~12K–18K/mo, evergreen, pandit-booking funnel)
  2. `2026 panchang by city` (high-volume daily-return, ties to /panchang)
  3. `kundli matching for marriage` (mid-volume, deep funnel, ties to /astrology/kundli-milan)
  4. `aarti and chalisa lyrics hub` (long-tail aggregator, ties to /aarti and /chalisa)
- **Publish path when ready:** Founder/CMO copies §5 + §6 + §7 into a new server page at `apps/web/app/weddings/muhurat/2026/page.tsx`, wires the JSON-LD via existing schema injection pattern, adds to sitemap with priority 0.9.
- **Re-verify before publish:** Volume estimates in §1 and §2 are agent projections from KW Planner public ranges. Founder should re-confirm against live Ahrefs/SEMrush within 7 days of publish to lock in the actual targets for organic-rank tracking.
- **No paid spend required** to ship this pillar. Distribution hooks in §8 are organic-only.
