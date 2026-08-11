# apps\web\app\pujas\marriage\book\page.tsx

- StepId · type · L30-L30 — Union type restricting the wizard to its five valid step numbers.
- BookMarriage · function · L42-L723 — Client component that collects couple, ceremony, pandit, and venue details across gated steps, computes the price from tier plus per-add-on fees, and ends in a callback request rather than a real payment.
- canProceed · function · L77-L83 — Per-step validation guard that blocks advancing until the current step's required fields (names/date, ceremony/tier, pandit, venue/city/10-digit contact) are filled.
- goNext · function · L85-L85 — Advances the wizard one step only when the current step passes validation.
- goBack · function · L86-L86 — Returns the wizard to the previous step without going before step one.
- toggleAddOn · function · L88-L90 — Adds or removes a ceremony add-on from the selection, which feeds the flat per-add-on price calculation.
- handlePay · function · L98-L104 — Simulates a brief processing state then shows the callback-request screen, intentionally avoiding any fake payment or fabricated booking ID while the pandit catalog is mock data.
- Row · function · L725-L732 — Presentational helper rendering a label/value row in the review summary.
