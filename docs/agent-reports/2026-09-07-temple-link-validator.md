# Temple link validator — 2026-09-07

Probed **31** official URLs across **11** temples.

- OK (2xx): **10**
- Redirects (3xx): **6**
- Broken (4xx/5xx/timeout): **15**

## P1 — Broken (devotee sees dead link)

| Temple | Field | URL | Status | Time | Error |
|---|---|---|---|---|---|
| Shri Kashi Vishwanath Temple | officialBookingUrl | https://shrikashivishwanath.org/Home/SugamDarshan | 404 | 278ms |  |
| Shri Kashi Vishwanath Temple | officialDarshanBookingUrl | https://shrikashivishwanath.org/Home/SugamDarshan | 404 | 212ms |  |
| Baidyanath Jyotirlinga (Baba Dham) | officialWebsite | https://babadham.org | TIMEOUT | 10001ms | This operation was aborted |
| Baidyanath Jyotirlinga (Baba Dham) | officialBookingUrl | https://babadham.org/online-puja | TIMEOUT | 10001ms | This operation was aborted |
| Shri Mata Vaishno Devi Shrine | officialBookingUrl | https://www.maavaishnodevi.org/yatra-registration.aspx | 404 | 944ms |  |
| Shri Mata Vaishno Devi Shrine | officialDarshanBookingUrl | https://www.maavaishnodevi.org/yatra-registration.aspx | 404 | 710ms |  |
| Shree Jagannath Temple, Puri | officialWebsite | https://shreejagannatha.in | TIMEOUT | 10000ms | This operation was aborted |
| Shree Jagannath Temple, Puri | officialBookingUrl | https://shreejagannatha.in/online-donation-2 | TIMEOUT | 10000ms | This operation was aborted |
| Shree Jagannath Temple, Puri | officialDarshanBookingUrl | https://www.siddhivinayak.org/online_booking.php | 404 | 898ms |  |
| Arulmigu Meenakshi Sundareswarar Temple | officialWebsite | https://maduraimeenakshi.org | TIMEOUT | 129ms | fetch failed |
| Arulmigu Meenakshi Sundareswarar Temple | officialBookingUrl | https://maduraimeenakshi.org/onlinepuja | TIMEOUT | 128ms | fetch failed |
| Arulmigu Meenakshi Sundareswarar Temple | officialDarshanBookingUrl | https://maduraimeenakshi.org/onlinedarshan | TIMEOUT | 256ms | fetch failed |
| Ramanathaswamy Temple, Rameshwaram | officialWebsite | https://rameswaramtemple.tnhrce.in | TIMEOUT | 10000ms | This operation was aborted |
| Ramanathaswamy Temple, Rameshwaram | officialBookingUrl | https://rameswaramtemple.tnhrce.in | TIMEOUT | 10000ms | This operation was aborted |
| Ramanathaswamy Temple, Rameshwaram | officialDarshanBookingUrl | https://rameswaramtemple.tnhrce.in | TIMEOUT | 10000ms | This operation was aborted |

**Action**: open `apps/web/lib/temple-details.ts`, find slug `kashi-vishwanath`, replace dead URL with current value from temple's primary domain. Re-run agent to verify.

## P2 — Redirects (update URL to final target)

| Temple | Field | URL | → Location |
|---|---|---|---|
| Sri Harmandir Sahib (Golden Temple) | officialBookingUrl | https://sgpc.net/sri-harmandir-sahib | https://sgpc.net/sri-harmandir-sahib/ |
| Shri Badrinath Dham | officialWebsite | https://badrinath-kedarnath.gov.in | https://badrinath-kedarnath.gov.in/errorpage.htm |
| Shri Badrinath Dham | officialBookingUrl | https://www.badrinath-kedarnath.gov.in/ | http://badrinath-kedarnath.gov.in/errorpage.htm |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialWebsite | https://dwarkadhish.org | https://www.dwarkadhish.org/ |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialBookingUrl | https://dwarkadhish.org | https://www.dwarkadhish.org/ |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialDarshanBookingUrl | https://dwarkadhish.org | https://www.dwarkadhish.org/ |

