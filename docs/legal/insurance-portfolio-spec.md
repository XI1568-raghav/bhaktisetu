# Bhaktisetu Insurance Portfolio Spec

> Pre-Series-A insurance coverage to protect Foundation + founder + customers from operational + data + liability risks.

> **Correction 2026-09-02 (`OPS-10`).** Two lines below used to name **Stripe** as a
> current vendor / sub-processor. **Stripe was removed from the codebase on
> 2026-08-11** — every remaining mention in `apps/api/src` is a removal note
> (`lib/env.ts:45-46`, `services/payment.service.ts:2506-2517`). Razorpay is the only
> live payment processor and it settles INR only; no replacement international rail
> has been chosen. Do not name Stripe to a broker or an underwriter: a sub-processor
> list is a material disclosure on a cyber-liability proposal form, and naming a
> processor that is not in the stack is a misrepresentation that an insurer can
> decline a claim on. The vendor list here is marked `[verify]` until the owner
> confirms the actual processor set.

## Why insurance now

- Section 8 Foundation has same liability as for-profit company
- Customer data breach = ₹50L-₹5Cr potential exposure
- Pandit no-show or fraud = customer indemnification needed
- Vendor failure (Razorpay; plus any other processors the owner confirms — `[verify]`) = cascading exposure
- Founder personal liability needs D&O coverage for board governance
- Insurance is non-negotiable Series A due-diligence requirement

## Recommended insurance portfolio

### 1. Cyber Liability Insurance (PRIORITY)

**Coverage**: Data breach incidents, ransomware, customer DPDP fines, business interruption from cyber attack
**Premium**: ₹15,000-50,000/yr depending on coverage
**Coverage limit**: ₹50L-2Cr
**Provider options**: HDFC ERGO, ICICI Lombard, Bajaj Allianz, Tata AIG (cyber-specific products)
**Specific events covered**:
- Customer data breach (PII exposure) — DPDP fines up to 4% of annual turnover
- Vendor sub-processor breach (Razorpay scope; full sub-processor list `[verify]` before it goes on a proposal form)
- Ransomware payment + recovery
- Business interruption from outage
- Customer notification expenses (legal mandate per DPDP)
- Regulatory investigation costs

**Action**: Q3 quote 3 providers + select; activate Q4 launch.

### 2. Professional Liability Insurance (E&O)

**Coverage**: Errors + omissions in service delivery (pandit failure, video proof missing, refund disputes)
**Premium**: ₹10,000-30,000/yr
**Coverage limit**: ₹25L per incident
**Provider options**: New India Assurance, United India Insurance
**Specific events covered**:
- Pandit no-show + customer indemnification
- Video proof missing/falsified (consumer compensation)
- Booking date errors causing customer harm
- Religious sensitivity disputes (rare but possible)
- Service mis-representation legal claims

**Action**: Q3 quote + activate.

### 3. Directors & Officers (D&O) Insurance

**Coverage**: Founder + advisory board personal liability for governance decisions
**Premium**: ₹20,000-60,000/yr
**Coverage limit**: ₹50L-1Cr
**Provider options**: ICICI Lombard, HDFC ERGO, TATA AIG
**Specific events covered**:
- Mismanagement claims by stakeholders
- Investor disputes post-Series-A
- Government investigation (DPDP, CSR Act violations)
- Personal liability for founder during legal proceedings

**Action**: Q3 quote + activate pre-pre-seed close (already due before SAFE signings).

### 4. Public Liability Insurance

**Coverage**: Third-party bodily injury or property damage caused by Bhaktisetu operations
**Premium**: ₹5,000-15,000/yr
**Coverage limit**: ₹25L per incident
**Specific events**:
- In-person pandit incident at customer location
- Yatra package customer injury (per R-Q2-P-003 future risk)
- Bhaktisetu office visitor injury (when physical office exists)

**Action**: Q4 activate as yatra packages launch.

### 5. Workers Compensation Insurance (post first hire)

**Coverage**: Statutory employee accident + medical (per Indian labor law)
**Premium**: Variable by employee count + role
**Provider options**: Government-mandated New India + private alternatives
**Trigger**: When first salaried employee onboards (per R-Q4-H-001)

### 6. Business Property Insurance

**Coverage**: Office equipment + furniture + inventory
**Premium**: ₹5,000-10,000/yr
**Coverage limit**: ₹10L
**Trigger**: When physical office opens (currently remote; Q1-Q2 2027 expected)

### 7. Fire + Allied Perils Insurance

**Coverage**: Office + equipment fire/flood/earthquake
**Premium**: ₹3,000-8,000/yr
**Coverage limit**: ₹10L
**Trigger**: When physical office opens

### 8. Specific Customer Insurance Products

**Coverage**: Insurance products for customers (e.g., yatra travel insurance, antim-sanskar dignity insurance)
**Premium**: Sourced from insurance partners + bundled into pricing
**Trigger**: Q3-Q4 launch as yatra + antim sanskar products scale

## Annual insurance budget

| Year | Total Premium | Coverage Aggregate |
|---|---|---|
| Q3-Q4 2026 (pre-Series A) | ₹50,000-1L | ₹1.5Cr aggregate |
| Q1 2027 (post-Series A) | ₹1.5L-3L | ₹3Cr aggregate |
| Q4 2027 (Series A scale) | ₹3L-5L | ₹5Cr aggregate |
| Y3+ (post-Series B target) | ₹10L+ | ₹10Cr+ aggregate |

## Provider selection criteria

- Indian insurer (not foreign) for DPDP + Indian law compliance
- 24/7 claims hotline
- 7-day claim filing window
- 90% claim approval rate (avoid bad-faith insurers)
- Sub-broker support for negotiation
- Annual policy review allowed

## Counsel review

Each policy reviewed by lawyer before signing:
- Coverage exclusions clearly identified
- Sub-limits explained
- Deductibles agreed
- Excess clauses understood
- Renewal terms favorable

## Claim process

For any insurance-eligible incident:
1. Within 24 hours: Notify insurer (legal requirement)
2. Document incident (photos, communications, customer statements)
3. File formal claim within 7 days
4. Engage broker if claim disputed
5. Receive payout within 30-60 days typical

## Founder responsibilities

- Annual insurance audit + renewal coordination
- Quarterly review of coverage gaps
- Pre-acquisition insurance documentation for potential exit
- Investor reporting on insurance coverage as part of risk management

## ROI

- Without insurance: One major incident could shut down Foundation
- With insurance: ₹50K-1L annual premium protects ₹1Cr+ potential losses
- Series A due diligence requirement (uninsured = unfundable)
- Customer trust signal (insured platform vs uninsured)
- Founder peace of mind for high-stakes operations
