# apps\web\app\status\page.tsx

- Monitor · type · L8-L12 — Shape of one service monitor row (name, up/down/unknown status, formatted uptime) shown on the status page.
- normalizeStatus · function · L21-L25 — Converts UptimeRobot's varied status representations (strings or numeric codes 2/9) into the page's canonical up/down/unknown enum.
- normalizeUptime · function · L27-L37 — Extracts a 30-day uptime percentage from whichever field the feed provides and formats it as a percent string, defaulting to an em dash.
- loadMonitors · function · L39-L69 — Fetches and normalizes live monitor data from the configured UptimeRobot URL, returning fallback placeholder monitors on any misconfiguration, HTTP error, empty payload, or exception.
- StatusDot · function · L71-L89 — Renders a colored dot plus text label so visitors can see at a glance whether a service is up (green), down (red), or unknown (gray).
- StatusPage · function · L91-L161 — Server component that renders the status page: a warning banner when only fallback data is available, plus a table of monitors with status dots and uptime figures.
