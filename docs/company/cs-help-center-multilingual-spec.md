# Multilingual Self-Serve Help Center — 50 articles × 6 languages

> **Roadmap item**: R-Q3-CS-002 (P0) · **Authored**: 2026-06-12 · **Target effective date**: Q3 (Oct 2026) — post first-CS-hire

## Goal

Self-serve help center cuts CS load by 40-60%. Devotee can search "how do I reschedule" → find article → resolve w/o ticket. 50 articles × 6 languages (en/hi/ta/te/bn/mr) = 300 article-pieces.

## Article inventory (50 topics)

### Booking & payments (15)

1. How to book your first puja
2. What does "video proof" mean — and when do I get it?
3. Payment failed — how do I retry?
4. How to apply wallet credit to my booking
5. Booking confirmation didn't arrive — what now?
6. How is the price set? (transparent ₹501 vs $50 NRI math)
7. Reschedule before 48 hours — free
8. Reschedule under 48 hours — process
9. Cancel + refund timing (UPI 1-3 days, Card 5-7 days)
10. Refund didn't arrive — what to do
11. UPI vs card vs netbanking within Razorpay (which to choose) *(corrected 2026-09-02, `OPS-10`: this article was titled "UPI payment vs Razorpay vs Stripe (which to choose)". Stripe was removed from the codebase on 2026-08-11 — `apps/api/src/lib/env.ts:45-46` — and Razorpay is the only live rail, settling **INR only**. Do not write an article telling a devotee to choose a processor we do not have. Any international/NRI payment article is blocked on `[verify]` — no replacement processor has been chosen.)*
12. Why is NRI pricing 9-10x domestic?
13. 80G receipt — when + how
14. Bulk booking (5+ pujas same day)
15. Pre-booking for festivals (60-day advance window)

### Puja execution (10)

16. What is sankalp + how to fill devotee names
17. How do you select pandit for my puja?
18. Pandit didn't show up — what now?
19. Video proof delay — escalation
20. Pandit speaking different language than expected
21. Live darshan stream froze during my puja
22. Special instructions to pandit (gotra / tradition / etc)
23. Prasad delivery — timing + tracking
24. Spoiled prasad — refund policy
25. Festival puja — what's different?

### Account & profile (8)

26. How to update my phone / email / address
27. Update PAN for 80G receipt
28. Multiple bookings same user — separate or merge?
29. Family adding bookings under one account
30. Account deletion (DPDP rights)
31. Download my data (DPDP export)
32. Privacy settings — marketing opt-out
33. Forgot OTP — recovery flow

### Subscriptions (8)

34. What is Adopt-a-Temple subscription
35. Subscription tiers (Bronze/Silver/Gold/Corporate)
36. Pause / resume / cancel subscription
37. Annual 80G consolidated receipt
38. Switch from Bronze to Silver tier
39. Monthly impact PDF — what's inside
40. Temple I adopted got deactivated — what now?
41. Subscription auto-renew failed

### Trust & safety (5)

42. How are temples verified?
43. How are pandits verified (KYC + reference checks)
44. Reporting a pandit issue
45. Refund dispute escalation (final tier)
46. Data security — how Bhaktisetu protects your info

### Special services (4)

47. Antim Sanskar booking process
48. Asthi visarjan booking (Hardwar / Prayagraj)
49. Wedding planning (muhurat + venue + pandit)
50. Astrology consultation (Vedic / KP / Lal Kitab)

## Article template (each piece)

```markdown
# {Article title}

> Last updated: YYYY-MM-DD · 2-min read · Tags: {tags}

## Quick answer

{1-2 sentence direct answer}

## Detailed steps

1. {step 1}
2. {step 2}
3. {step 3}

## Why this works this way

{1-2 sentence rationale — devotional sensitivity context}

## Still stuck?

WhatsApp: {founder WA}
Email: support@darshya.online
```

## Language priority

| Language | Priority | Source | Reviewer |
|---|---|---|---|
| English | 1 | Founder-authored | Founder |
| Hindi (Devanagari) | 2 | Translate from English | Native-fluent reviewer (per macros-v1-hi.md pattern) |
| Tamil | 3 | Translate | Tamil reviewer (per macros-v1-ta.md) |
| Telugu | 4 | Translate | Telugu reviewer (per macros-v1-te.md) |
| Marathi | 5 | Translate | Native (NOT shipped yet — separate CS-001c ticket) |
| Bengali | 6 | Translate | Native (NOT shipped — separate ticket) |

v1 target: 50 articles × 4 languages (English / Hindi / Tamil / Telugu) = 200 article-pieces.
v2 (post-launch): +Marathi + Bengali = 300 pieces.

## Tech storage

Options:
- Markdown files in `docs/help/` rendered via Next.js → /help/{slug}
- Notion / Helpscout / Crisp Helpdocs (free tiers exist)

**Recommend**: markdown in repo → renders at /help/[slug] page. Free, version-controlled, syncs w/ product.

## SEO bonus

Help articles ALSO act as long-tail SEO content. Each article = potential ranking page for "{puja-type} {action}" queries. Cross-link to R-Q3-M-014 SEO surgery audit.

## Founder action

```markdown
- [ ] Cycle 1 (next): write 10 English articles (top-traffic: refund / video / cancel / reschedule / book / 80G / etc.)
- [ ] Cycle 2: translate to Hindi (use macros-v1-hi.md pattern) — founder + Hindi reviewer
- [ ] Cycle 3: translate to Tamil + Telugu (use macros-v1-ta.md / -te.md patterns)
- [ ] Cycle 4: build /help/[slug] page on Next.js *(corrected 2026-09-02, `OPS-10`: this item was gated "post-edge-runtime sweep". There is no edge-runtime constraint — the web tier is the Render Docker service `darshya-web` running Next standalone on Node, `render.yaml:52-60`; Cloudflare Pages stopped serving it at the 2026-07-08 cutover, so the sweep this ticket waited on does not exist and the gate is removed.)*
- [ ] Cycle 5: launch publicly + measure deflection (CS ticket volume drop %)
- [ ] Per-cycle: 10 more articles until 50 reached
```

## Out of scope

- AI search over help articles (defer to v2 once article volume justifies)
- Video articles (defer; markdown text first)
- User-contributed FAQ (defer to v3 if community emerges)
- Real-time chat suggestions (defer — out of CS-001 scope)

## Closes

R-Q3-CS-002 — spec shipped. Status flips to shipped after 50 EN articles authored + 4-language coverage complete.
