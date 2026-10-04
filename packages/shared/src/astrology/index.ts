// ──────────────────────────────────────────────────────────────────────────
// @poojly/shared/astrology — the Vedic calculators BOTH clients run.
//
// WHY THIS PACKAGE EXISTS
// -----------------------
// Every one of these tools used to live only in apps/web/lib, so the mobile
// app had nothing to call and routed devotees to the website. The blocker was
// never that the maths needed a server — none of it does — it was that the
// maths lived inside one app. Moving it here is the whole fix.
//
// It is a MOVE, not a copy. apps/web/lib/{numerology,nakshatra-finder,
// kundli-milan,manglik,choghadiya,rahu-kalam}.ts are now thin re-exports of
// these modules. A second copy would drift, and this codebase has already paid
// that bill once: wedding prices differed 5x between web and mobile because
// each hardcoded its own.
//
// WHAT IS DELIBERATELY NOT HERE
// -----------------------------
// `GET /astrology/compatibility` on the API is NOT a gun milan — it scores two
// rashi NAMES with arithmetic over their character codes. Nothing in this
// package calls it, and kundli-milan.ts below is the real Ashtakoot.
// ──────────────────────────────────────────────────────────────────────────

export * from './nakshatra-table.js';
export * from './nakshatra-finder.js';
export * from './manglik.js';
export * from './kundli-milan.js';
export * from './numerology.js';
export * from './choghadiya.js';
export * from './rahu-kalam.js';
