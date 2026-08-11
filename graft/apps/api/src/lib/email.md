# apps\api\src\lib\email.ts

- SendEmailParams · interface · L18-L24 — Parameter shape describing everything needed to compose one outgoing transactional email, including optional attachments.
- SendEmailResult · interface · L26-L31 — Result shape letting callers distinguish a sent email, a skipped send (no API key), and a failure with an error message.
- sendEmail · function · L33-L52 — Sends a transactional email through Resend but gracefully skips sending when no API key is configured so demo/local environments keep working.
- shell · function · L72-L77 — Wraps email body content in Darshya's branded HTML layout with shared styles and footer so all templates look consistent.
- magicLinkEmail · function · L79-L92 — Builds the passwordless sign-in email containing a one-time 15-minute magic link.
- bookingConfirmationEmail · function · L94-L119 — Builds the confirmation email telling a devotee their puja booking is confirmed, with schedule, amount, and a link to track the booking and its video proof.
- providerApprovedEmail · function · L121-L144 — Builds the email notifying a service provider their profile was approved and is live, optionally including their public profile link.
- providerRejectedEmail · function · L146-L170 — Builds the email informing an applicant their provider profile was rejected, including the reviewer's reason when given and a link to resubmit.
- supportTicketAlertEmail · function · L172-L199 — Builds the internal alert email to admins for a new support ticket, escaping the user's message body to prevent HTML injection.
- supportTicketReceivedEmail · function · L201-L219 — Builds the acknowledgement email assuring a user their support ticket was logged, with ticket number, tracking link, and support hours.
- supportTicketReplyEmail · function · L221-L238 — Builds the email notifying a user of a new support-team reply, escaping the reply body to prevent HTML injection.
- donationReceiptEmail · function · L240-L261 — Builds the thank-you email for a gaushala donation with receipt details and a note that the 80G tax receipt PDF is attached.
