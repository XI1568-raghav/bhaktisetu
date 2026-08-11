# apps\web\components\home\NriLaneAbTest.tsx

A/B test harness that shows the NRI gift-puja promo card either above or below the fold based on the resolved nri_lane_above_fold variant, ensuring only one of the two mounted slots renders per page view.

- Props · interface · L24-L26 — Identifies which page slot ('above' or 'below') a given mount occupies so the two mounts can gate rendering and avoid double-firing exposure.
- NriLaneAbTest · function · L28-L84 — Resolves the nri_lane_above_fold experiment variant and renders the NRI gift-puja link card only in the slot matching that variant, staying empty in the other slot.
