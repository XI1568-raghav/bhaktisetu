# apps\api\src\routes\donations.ts

- DonationRow · type · L42-L58 — Row shape for raw-SQL access to the donations table, capturing the polymorphic donee (gaushala_id XOR temple_id), Razorpay identifiers, and donor PAN/dedication needed for 80G receipts.
- GaushalaTaxRow · type · L60-L63 — Holds the gaushala's PAN and 80G registration number so generated receipts can carry the donee's real tax identities.
- ensureGaushalaTaxFields · function · L68-L75 — Idempotently adds pan and regn_80g columns to gaushala_profiles via raw DDL so receipts can carry tax IDs without regenerating the Prisma client mid-deploy.
- nextReceiptNumber · function · L77-L82 — Mints unique human-readable donation receipt numbers in the form DR-YYYYMMDD-XXXX for 80G receipt tracking.
- finalizeDonationReceipt · function · L94-L200 — Idempotently marks a donation paid, mints its receipt number, and generates/emails the 80G PDF — shared by /verify and the Razorpay webhook so double-verifies never re-mint receipts and closed browsers still get receipts.
- noop · function · L99-L99 — No-op fallback so the optional webhook logger can be defaulted without null checks.
- findDonationByOrderId · function · L205-L219 — Looks up a donation row by its Razorpay order id so the webhook backstop can finalize payments whose client-side verify never fired.
- donationRoutes · function · L259-L427 — Registers the create-order and verify endpoints that enforce donation amount floors/caps, polymorphic donee integrity, caller ownership, and timing-safe Razorpay signature verification before finalizing the receipt.
