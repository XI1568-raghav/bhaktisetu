# apps\api\src\services\cancellation.service.ts

Policy engine that computes cancellation refunds for puja bookings from a per-booking snapshotted tiered policy, replacing the old binary 24h full-refund rule with a market-anchored partial-refund ladder plus pandit-fault and no-show paths.

- CancelPolicyTier · interface · L25-L31 — Defines one rung of the refund ladder: the minimum hours-before-slot threshold and the fraction of the puja price refunded when cancellation happens at or above it.
- CancelPolicy · interface · L33-L43 — Bundles the full cancellation policy snapshotted per booking — devotee refund tiers, pandit-cancel and no-show fractions, priest compensation share, and refund timeline label — so policy changes never retro-affect existing bookings.
- RefundComputation · interface · L59-L67 — Result shape carrying the computed refund/fee amounts, matched tier, and fault attribution for a cancellation decision.
- CancellationService · class · L69-L193 — Service that snapshots cancellation policies onto bookings and computes refunds for devotee cancellations, pandit-fault cancellations, and no-shows, plus re-queues bookings when a pandit cancels.
- snapshotPolicy · method · L71-L77 — Persists the current cancellation policy onto a booking at confirm time so later policy edits don't change that booking's refund terms.
- getPolicy · method · L80-L87 — Reads a booking's snapshotted cancellation policy, falling back to the current default for legacy rows that predate snapshotting.
- computeDevoteeRefund · method · L94-L116 — Computes a devotee-initiated cancellation refund by picking the first policy tier whose hours-before threshold the remaining time satisfies and applying its fraction to the puja price.
- computePanditFaultRefund · method · L122-L134 — Computes the refund when the pandit side cancels, making the devotee whole by refunding the full amount paid per platform-absorbs-fault policy.
- computeNoShowRefund · method · L137-L149 — Computes the refund when a devotee no-shows after the pandit arrived, applying the policy's no-show fraction (normally zero) to the total paid.
- panditCancel · method · L157-L192 — Handles a pandit-initiated cancellation by validating ownership/status, releasing the booking back to confirmed for immediate re-dispatch to another priest, and notifying the devotee of re-matching.
