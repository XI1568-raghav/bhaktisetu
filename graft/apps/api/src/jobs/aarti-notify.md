# apps\api\src\jobs\aarti-notify.ts

- istMinutesNow · function · L24-L27 — Converts a UTC timestamp into minutes-since-midnight in IST so aarti slot times can be compared against the current Indian local time.
- istYmd · function · L29-L32 — Produces the IST calendar date string used to scope dedupe keys so the same aarti can fire again on subsequent days.
- maybeFlush · function · L38-L43 — Clears the in-memory dedupe set once every 24 hours to bound memory in the long-running cron process.
- AartiNotifyResult · interface · L45-L53 — Result shape reporting how many temples were checked, aartis matched, pushes sent, tokens expired, and failures for a notify run.
- FcmTokenRow · interface · L55-L59 — Row shape for a device's FCM token with its owner's aarti opt-in flag.
- FcmTokenModel · interface · L61-L67 — Minimal structural type for the Prisma fcmDeviceToken delegate so the job compiles even before the migration adds the model.
- TempleFollowModel · interface · L69-L74 — Minimal structural type for the Prisma templeFollow delegate used to look up a temple's followers.
- runAartiNotify · function · L76-L180 — Scans live-darshan temples for aarti slots starting in 14–16 minutes, dedupes per temple/slot/day, builds the follower-plus-global-opt-in audience, sends pushes, and prunes expired tokens.
