# apps\api\src\routes\admin-leads.ts

- LeadModel · type · L52-L59 — Structural type describing just the Prisma Lead delegate methods these routes use, so the code compiles and runs even before the Lead model exists in the generated Prisma client.
- leadModel · function · L61-L64 — Defensive accessor that returns the Prisma lead delegate or null when the table hasn't been migrated yet, letting every lead route degrade to empty results or a 503 rather than crashing.
- outreachModel · function · L66-L79 — Defensive accessor that returns the Prisma outreachLog delegate or null when the migration hasn't landed, so outreach stats can fall back to zeroed 30-day buckets.
- waitlistModel · function · L81-L94 — Defensive accessor that returns the Prisma waitlist delegate or null when the migration hasn't landed, so waitlist stats can fall back to an empty funnel.
- startOfDayUtc · function · L96-L100 — Truncates a timestamp to UTC midnight so outreach and waitlist events can be bucketed by calendar day for the daily stats charts.
- lastNDays · function · L102-L111 — Builds the ordered list of the last n UTC day-start dates that serve as the fixed buckets for the 30-day daily stats series.
- adminLeadsRoutes · function · L113-L566 — Registers all admin-only lead, outreach, and waitlist endpoints, whose most consequential rule is that flipping a lead to CONVERTED idempotently provisions a real User plus an approved provider profile so the lead can actually sign in.
