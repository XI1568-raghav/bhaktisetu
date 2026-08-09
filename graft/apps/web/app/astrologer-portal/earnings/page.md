# apps\web\app\astrologer-portal\earnings\page.tsx

- EarningRow · interface · L17-L25 — Shape of one per-consultation earning record returned by the API, splitting gross amount, platform cut, and the astrologer's net earnings.
- Summary · interface · L27-L32 — Aggregate totals (total, pending, paid) plus the astrologer's revenue-share fraction used to headline the earnings dashboard.
- formatINR · function · L34-L36 — Formats a number as whole-rupee Indian currency for display.
- AstrologerEarningsPage · function · L38-L161 — Page component that fetches the logged-in astrologer's own earnings from /astrologer-portal/earnings and renders summary cards plus a per-consultation list with paid/pending status.
