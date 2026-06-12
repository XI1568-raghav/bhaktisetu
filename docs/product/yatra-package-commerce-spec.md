# Yatra Package Commerce — 5 Packages Live + Real Razorpay

> **Roadmap item**: R-Q2-P-003 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q1-P-007 yatra-inquiry MVP

## Goal

Q2 ship 5 yatra packages live w/ real Razorpay payments (not just inquiry). Targets ₹2L MRR from yatra Q2-end.

## 5 packages

| # | Package | Duration | From cities | Price |
|---|---|---|---|---|
| 1 | Char Dham (Yamunotri + Gangotri + Kedarnath + Badrinath) | 10D/9N | Delhi/Mumbai/Bengaluru | ₹35K-60K |
| 2 | Vaishno Devi + Amarnath | 5D/4N | Delhi | ₹15K-25K |
| 3 | Tirupati + Sabarimala (S India circuit) | 6D/5N | Bengaluru/Chennai | ₹20K-30K |
| 4 | Varanasi + Gaya (Shraddha specific) | 4D/3N | Delhi/Mumbai/Bengaluru | ₹15K-25K |
| 5 | Pancha Bhoota (Tamil Nadu 5-temple Shiva) | 7D/6N | Chennai/Bengaluru | ₹25K-35K |

## End-to-end flow

1. Browse /yatra → 5 package cards
2. Click package → /yatra/{slug} detail (full itinerary + photos + dates available)
3. Select date + traveler count → /yatra/{slug}/book
4. Razorpay checkout (₹15K-60K depending on package)
5. Payment success → email confirmation + WhatsApp itinerary + add-to-cal
6. 24hr before yatra: assigned travel coordinator WhatsApp activation
7. Daily updates during yatra via WhatsApp
8. Post-yatra: feedback survey + 80G receipt

## Engineering tickets

- R-Q2-P-003a: Yatra Prisma model (packages, dates, bookings, travelers, itinerary)
- R-Q2-P-003b: 5 yatra detail pages
- R-Q2-P-003c: Yatra booking checkout (Razorpay)
- R-Q2-P-003d: Yatra dashboard for ops (booking status + traveler comm)
- R-Q2-P-003e: WhatsApp messaging templates (15+ templates)

## Operations

- Partner travel agency for execution (5-10% margin to Bhaktisetu, 30-40% to agency, 30-40% to vendor)
- Founder pre-vet 5 partner agencies (Q2 month 4-5)
- Pilot first 10 customers w/ founder oversight

## Closes

R-Q2-P-003 — spec shipped.
