# Temple link validator — 2026-06-08

Probed **31** official URLs across **11** temples.

- OK (2xx): **16**
- Redirects (3xx): **7**
- Broken (4xx/5xx/timeout): **8**

## P1 — Broken (devotee sees dead link)

| Temple | Field | URL | Status | Time | Error |
|---|---|---|---|---|---|
| Shri Kashi Vishwanath Temple | officialBookingUrl | https://shrikashivishwanath.org/Home/SugamDarshan | 404 | 186ms |  |
| Shri Kashi Vishwanath Temple | officialDarshanBookingUrl | https://shrikashivishwanath.org/Home/SugamDarshan | 404 | 102ms |  |
| Baidyanath Jyotirlinga (Baba Dham) | officialBookingUrl | https://babadham.org/online-puja | 404 | 713ms |  |
| Tirumala Tirupati Venkateswara Temple | officialWebsite | https://tirupatibalaji.ap.gov.in | TIMEOUT | 10002ms | This operation was aborted |
| Shri Mata Vaishno Devi Shrine | officialBookingUrl | https://www.maavaishnodevi.org/yatra-registration.aspx | 404 | 1038ms |  |
| Shri Mata Vaishno Devi Shrine | officialDarshanBookingUrl | https://www.maavaishnodevi.org/yatra-registration.aspx | 404 | 266ms |  |
| Shree Jagannath Temple, Puri | officialWebsite | https://shreejagannatha.in | TIMEOUT | 10000ms | This operation was aborted |
| Shree Jagannath Temple, Puri | officialDarshanBookingUrl | https://www.siddhivinayak.org/online_booking.php | 404 | 845ms |  |

**Action**: open `apps/web/lib/temple-details.ts`, find slug `kashi-vishwanath`, replace dead URL with current value from temple's primary domain. Re-run agent to verify.

## P2 — Redirects (update URL to final target)

| Temple | Field | URL | → Location |
|---|---|---|---|
| Shree Jagannath Temple, Puri | officialBookingUrl | https://shreejagannatha.in/online-donation-2 | https://www.shreejagannatha.in/online-donation-2 |
| Sri Harmandir Sahib (Golden Temple) | officialBookingUrl | https://sgpc.net/sri-harmandir-sahib | https://sgpc.net/sri-harmandir-sahib/ |
| Shri Badrinath Dham | officialWebsite | https://badrinath-kedarnath.gov.in | https://badrinath-kedarnath.gov.in/errorpage.htm |
| Shri Badrinath Dham | officialBookingUrl | https://www.badrinath-kedarnath.gov.in/ | http://badrinath-kedarnath.gov.in/errorpage.htm |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialWebsite | https://dwarkadhish.org | https://www.dwarkadhish.org/ |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialBookingUrl | https://dwarkadhish.org | https://www.dwarkadhish.org/ |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialDarshanBookingUrl | https://dwarkadhish.org | https://www.dwarkadhish.org/ |

