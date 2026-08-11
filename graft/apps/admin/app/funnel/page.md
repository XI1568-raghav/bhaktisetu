# apps\admin\app\funnel\page.tsx

- pct · function · L7-L10 — Formats a count's share of a whole as a one-decimal percentage string, returning "0%" when the whole is zero to avoid division by zero.
- widthPct · function · L12-L15 — Converts a step count into a 0–100 bar-width percentage relative to the first step, clamping the result so bars never render negative or overflowing.
- FunnelPage · function · L17-L79 — Server component that fetches the cached PostHog funnel and selects which view to render — credential-setup instructions, retryable error, no-events notice, or the chart — based on the result status.
- FunnelChart · function · L81-L142 — Renders each funnel step as a proportional bar annotated with its raw count, percentage of step 1, and drop-off rate from the previous step.
- EmptyState · function · L144-L160 — Presentational dashed-border panel that displays a title and explanatory message when the funnel cannot be rendered.
