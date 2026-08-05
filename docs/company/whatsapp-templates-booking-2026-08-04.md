# WhatsApp Templates to Approve — Booking Notifications

**Action needed (founder, ~15 min in Meta WhatsApp Manager):** create + submit these templates. The booking notification code (`booking-notify.service.ts`) no-ops safely until they're approved — no errors, just no WhatsApp sent (push still fires). Once approved, WhatsApp goes live automatically.

**Where:** [business.facebook.com](https://business.facebook.com) → WhatsApp Manager → Message templates → Create template → Category **Utility**.

All templates: **Language = English**, **Category = Utility**. Variables are positional (`{{1}}`…`{{6}}`) and map to: `devoteeName`, `pujaName`, `priestName`, `scheduledDate`, `timeSlot`, `bookingNumber`.

| Template name (exact) | Body |
|---|---|
| `booking_confirmed` | Namaste {{1}} 🙏 Your {{2}} booking is confirmed{{4}} for {{4}}. Booking: {{6}}. We'll assign your pandit shortly. — Darshya |
| `pandit_assigned` | Good news {{1}}! {{3}} will perform your {{2}} on {{4}} ({{5}}). Booking: {{6}}. Track it in the Darshya app. |
| `pandit_reassigned` | {{1}}, we're re-matching another pandit for your {{2}} (booking {{6}}). We'll confirm shortly — no action needed. — Darshya |
| `pandit_offer` | 🙏 New {{2}} booking request on {{4}} ({{5}}). Tap to accept in the Darshya pandit app before it expires. Booking: {{6}} |
| `pandit_offer_timeout` | The {{2}} request ({{6}}) expired and was reassigned to another pandit. Go on duty to receive more. — Darshya |
| `puja_started` | {{3}} has started your {{2}} (booking {{6}}). — Darshya |
| `puja_completed` | Your {{2}} (booking {{6}}) is complete 🙏 Video proof will be shared shortly. — Darshya |
| `puja_video_ready` | Your {{2}} video proof is ready (booking {{6}}). Watch it in the Darshya app. — Darshya |
| `booking_cancelled` | Your {{2}} booking ({{6}}) has been cancelled. Any refund will be processed per our policy. — Darshya |
| `booking_refund` | Refund for your {{2}} booking ({{6}}) is processed — expect it in 5-7 business days. — Darshya |
| `pandit_eta` | {{3}} is on the way for your {{2}} (booking {{6}})! — Darshya |

**Notes**
- Template names must match **exactly** (lowercase, underscores) — the code references them by name in `TEMPLATE` map.
- Keep them **Utility** (not Marketing) so they send without the 24h window and stay in the free utility tier.
- Once any template is rejected (Meta is picky about promotional language), strip emoji/superlatives and resubmit.
