# scripts\agents\onboarding-drip.mjs

Defines the source-of-truth 7-touch onboarding email drip content for each Darshya user role (devotee, pandit, temple, gaushala, etc.) and publishes it as a markdown report that the outreach cron reads to send via Resend.

- maybeSend · function · L153-L162 — Sends a single drip email through the Resend API, silently skipping delivery when no API key is configured so the agent can run in environments without email credentials.
- run · function · L164-L198 — Renders every role's drip sequence into a dated markdown report (with wire-up instructions for the cron/Resend integration) and persists it as the canonical reference for the outreach job.
