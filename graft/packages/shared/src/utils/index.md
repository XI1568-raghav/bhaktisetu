# packages\shared\src\utils\index.ts

Shared utility module for the pooja-booking platform providing locale-aware price/date formatting, booking-number generation, NRI detection, deity icon mapping, and booking price calculation.

- formatPrice · function · L8-L23 — Formats a monetary amount as INR or USD currency using the correct locale, notation, and fraction-digit conventions so prices display consistently across the app.
- formatDate · function · L28-L67 — Renders dates in Indian-locale styles, dispatching to relative-time or time-only output for those special formats before falling back to preset date option tables.
- getRelativeTime · function · L69-L87 — Converts a past date into a human-friendly 'Xm ago' style label by cascading through seconds/minutes/hours/days/weeks/months thresholds.
- generateBookingNumber · function · L93-L108 — Generates a unique human-readable booking reference in BS-YYYYMMDD-XXXXX format using a date stamp plus a random suffix drawn from an ambiguity-free character set.
- isNriUser · function · L113-L117 — Determines whether a user qualifies as an NRI (non-resident Indian) for pricing purposes by checking their country against accepted India code variants.
- getDeityIcon · function · L122-L148 — Maps a deity name (including common aliases) to a UI icon identifier, defaulting to the generic 'om' icon for unrecognised deities.
- slugify · function · L153-L163 — Converts arbitrary text into a URL-safe slug by lowercasing, replacing whitespace with hyphens, and stripping invalid characters and duplicate/edge hyphens.
- truncate · function · L168-L171 — Shortens text to a maximum length, appending an ellipsis only when the input actually exceeds the limit.
- buildQueryString · function · L176-L187 — Builds a URL query string from a params object while omitting undefined, null, and empty-string values, returning an empty string when nothing remains.
- titleCase · function · L192-L198 — Capitalises the first letter of each word in a string for consistent display of names and labels.
- parseTime · function · L203-L206 — Parses an HH:MM time string into numeric hours and minutes with zero defaults for missing parts.
- calculateBookingPrice · function · L211-L226 — Computes the final booking price by scaling the base price per devotee, applying an NRI surcharge multiplier, then subtracting any percentage discount and rounding to two decimals.
