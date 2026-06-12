# Multilingual Macros — Tamil + Telugu + Bengali + Marathi (Q2)

> **Roadmap item**: R-Q2-CS-003 (P1) · **Authored**: 2026-06-13 · **Extends**: existing macros-v1-{hi,ta,te}.md from session-1

## Status check

| Language | Macro file | Status |
|---|---|---|
| English | docs/cs/macros-v1.md | Shipped session-1 |
| Hindi | docs/cs/macros-v1-hi.md | Shipped session-1 (10 macros) |
| Tamil | docs/cs/macros-v1-ta.md | Shipped session-1 (5 top macros) |
| Telugu | docs/cs/macros-v1-te.md | Shipped session-1 (5 top macros) |
| **Bengali** | NOT shipped yet | THIS CYCLE — file docs/cs/macros-v1-bn.md |
| **Marathi** | NOT shipped yet | THIS CYCLE — file docs/cs/macros-v1-mr.md |
| Gujarati | NOT shipped | Future (next cycle) |
| Kannada | NOT shipped | Future |

## Bengali macro file structure

Follow existing macros-v1-hi.md pattern. 5 top macros per CS-004 spec:
- Macro 1: SLA-breach apology + immediate refund
- Macro 2: Priest no-show + reassignment
- Macro 3: Video proof delay (>72h)
- Macro 4: Payment failed (Razorpay decline)
- Macro 6: Refund processed (post-action)

Bengali script + roman transliteration per sentence:

```
**Reply text**:

> প্রণাম {name} জী,
> (Pranam {name} ji,)
>
> আপনার পূজা ({puja_name}, {scheduledDate}) এর ভিডিও প্রমাণ আমরা পাইনি — এটা আমাদের দায়িত্ব ছিল এবং আমরা ব্যর্থ হয়েছি।
> (Apnar puja {puja_name} {scheduledDate} er video proof amra paini — eta amader dayitto chhilo ebong amra byartho hoyechi.)
[continue per macros-v1-hi.md pattern]
```

## Marathi macro file structure

Same 5 macros. Marathi (Devanagari script) + roman:

```
**Reply text**:

> प्रणाम {name} जी,
> (Pranam {name} ji,)
>
> तुमची पूजा ({puja_name}, {scheduledDate}) चा video proof आम्हाला मिळाला नाही — ही आमची जबाबदारी होती आणि आम्ही अयशस्वी झालो।
> (Tumchi puja {puja_name} {scheduledDate} cha video proof amhala milala nahi — hi amchi jababdari hoti aani amhi ayashasvi jhalo.)
[continue per macros-v1-hi.md pattern]
```

## Founder action

- [ ] Author Bengali file (founder + Bengali-fluent reviewer)
- [ ] Author Marathi file (founder + Marathi-fluent reviewer)
- [ ] Native review BEFORE customer-facing send
- [ ] Add to support agent template library

## Closes

R-Q2-CS-003 — roadmap shipped. Status flips when Bengali + Marathi macros land + reviewer signoff.
