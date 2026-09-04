# [SUPERSEDED] Stripe NRI KYC — US/UK/CA/AU Activation

> **Roadmap item**: R-Q1-F-004 (P1) · **Authored**: 2026-06-13 · **Unblocks**: ~~U2~~ (void)

> ## ⛔ SUPERSEDED — DO NOT EXECUTE
>
> **Correction 2026-09-02 (`OPS-10`).** This spec is the source document behind `R-Q1-F-004` and describes activating Stripe as the NRI rail: "Option A: Stripe India (preferred — already onboarded)", a submission flow starting "Login Stripe Dashboard → Settings → Activate Account", "Multi-currency settlement: 25% premium vs INR-only", and "Stripe converts USD → INR daily at competitive FX rate (~₹83.50)".
>
> **Stripe was removed from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`, `apps/api/src/services/payment.service.ts:2438-2450`). Razorpay is the only live rail and it settles INR only. No replacement international processor has been chosen, so:
>
> - There is no Stripe account to activate and no dashboard to log into — the founder steps under "Stripe India submission" cannot be executed.
> - The "Non-profit / Section 8" business type below is **not** the platform entity. The live Razorpay account is an individual/proprietorship; submitting Section 8 documents would be a false declaration to a payment processor.
> - Every rate here is `[verify]`. The "~₹83.50" FX constant is the hardcoded-rate class RV-01 was rooted in, and the "25% premium" settlement figure is unverified. Do not carry either over to a different processor.
> - Business rule #2 (NRI pricing 9-10× domestic) does survive as schema data (`PujaType.nriPrice`, `apps/api/prisma/schema.prisma:446`), but it is **not charged at checkout today** and there is no USD checkout.
>
> Retained as decision history. The *shape* of the decision — domestic-entity rail vs foreign-entity rail, and the trade-off between KYC effort and NRI conversion — is still a real choice the owner faces once an international processor is picked. The vendor named throughout is not.

## Goal

Q1 submit Stripe NRI KYC to activate US/UK/CA/AU payments for diaspora puja booking. Currently test-mode only.

## Stripe entity options

### Option A: Stripe India (preferred — already onboarded)
- Use existing Stripe India account
- Multi-currency settlement to INR (FX conversion at Stripe rate)
- KYC simpler (same as Razorpay, Section 8 docs)
- Risk: lower NRI conversion (USD checkout less trusted in US)

### Option B: Stripe US LLC (founder establishes US Delaware LLC)
- Higher US trust, better NRI conversion
- KYC requires US EIN + US bank account + Delaware filing
- Founder establishes: $300 Delaware LLC + EIN application + Mercury bank account
- 30-60 day timeline

**Decision**: Start Option A (faster) → migrate Option B Q3 once revenue justifies.

## Stripe India submission

1. Login Stripe Dashboard → Settings → Activate Account
2. Business type: Non-profit / Section 8
3. Same docs as Razorpay (MoA + AoA + 80G + PAN + bank)
4. Country activation: India + US + UK + CA + AU enable
5. Multi-currency settlement: 25% premium vs INR-only (worth it for NRI premium pricing)

## Post-activation

- US/UK/CA/AU USD checkout live
- Stripe converts USD → INR daily at competitive FX rate (~₹83.50)
- Settlement to Bhaktisetu Foundation HDFC account weekly

## NRI pricing strategy

- USD pricing 9-10× INR (Bhaktisetu standard NRI multiplier)
- Example: Satyanarayan puja ₹3K India = $30 NRI
- 80G receipt: PAN required (not all NRI have, optional check)

## Engineering tickets

- R-Q1-F-004a: Stripe India NRI KYC submission
- R-Q1-F-004b: Multi-currency checkout flow per geo
- R-Q1-F-004c: USD pricing per-puja table
- R-Q1-F-004d: Q3 Option B evaluation gate

## Closes

R-Q1-F-004 — spec shipped.
