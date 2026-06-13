# UGC Reviews v2 Product Spec — Photo Prompts + Reviewer XP + Verified Badge

> **Roadmap item**: R-Q3-P-005 (P2) · **Authored**: 2026-06-13 · **Sibling**: R-Q3-E-014 backend

## Goal

Q3 product UX for UGC reviews v2. Photo prompts + reviewer XP gamification + verified badge.

## Reviewer XP

- 10 XP first review
- +5 XP per text >50 words
- +10 XP per photo
- +20 XP first verified-purchase badge
- 100 XP → "Trusted Reviewer" badge
- 500 XP → "Bhaktisetu Devotee" lifetime badge

## Photo prompts

After booking complete, user prompted via email:
- "Share a photo of your puja ceremony" (with consent disclaimer)
- "Photo of your prasad/offering" 
- "Photo of you w/ pandit (consent required)"

## Verified-purchase badge

Auto-applied if Review.bookingId matches confirmed paid booking.
Yellow checkmark + "Verified Purchase" label.

## UX flow

1. Booking complete + 24hr passed → email prompt
2. Click → /review/{bookingId} page
3. Pre-filled w/ puja + temple + pandit
4. Rating (1-5 stars) + text (optional) + 0-3 photos (optional)
5. Submit → XP awarded + thank-you page

## Engineering tickets

- R-Q3-P-005a: Review submission UI
- R-Q3-P-005b: XP system + leaderboard
- R-Q3-P-005c: Verified badge display logic
- R-Q3-P-005d: Email prompt cron

## Closes

R-Q3-P-005 — spec shipped.
