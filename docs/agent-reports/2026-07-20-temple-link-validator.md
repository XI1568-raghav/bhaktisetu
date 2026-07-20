# Temple link validator — 2026-07-20

Probed **31** official URLs across **11** temples.

- OK (2xx): **14**
- Redirects (3xx): **8**
- Broken (4xx/5xx/timeout): **9**

## P1 — Broken (devotee sees dead link)

| Temple | Field | URL | Status | Time | Error |
|---|---|---|---|---|---|
| Shri Kashi Vishwanath Temple | officialBookingUrl | https://shrikashivishwanath.org/Home/SugamDarshan | 404 | 376ms |  |
| Shri Kashi Vishwanath Temple | officialDarshanBookingUrl | https://shrikashivishwanath.org/Home/SugamDarshan | 404 | 171ms |  |
| Baidyanath Jyotirlinga (Baba Dham) | officialBookingUrl | https://babadham.org/online-puja | 404 | 773ms |  |
| Shri Mata Vaishno Devi Shrine | officialBookingUrl | https://www.maavaishnodevi.org/yatra-registration.aspx | 404 | 1013ms |  |
| Shri Mata Vaishno Devi Shrine | officialDarshanBookingUrl | https://www.maavaishnodevi.org/yatra-registration.aspx | 404 | 291ms |  |
| Shree Jagannath Temple, Puri | officialDarshanBookingUrl | https://www.siddhivinayak.org/online_booking.php | 404 | 1390ms |  |
| Ramanathaswamy Temple, Rameshwaram | officialWebsite | https://rameswaramtemple.tnhrce.in | TIMEOUT | 27ms | fetch failed |
| Ramanathaswamy Temple, Rameshwaram | officialBookingUrl | https://rameswaramtemple.tnhrce.in | TIMEOUT | 31ms | fetch failed |
| Ramanathaswamy Temple, Rameshwaram | officialDarshanBookingUrl | https://rameswaramtemple.tnhrce.in | TIMEOUT | 29ms | fetch failed |

**Action**: open `apps/web/lib/temple-details.ts`, find slug `kashi-vishwanath`, replace dead URL with current value from temple's primary domain. Re-run agent to verify.

## P2 — Redirects (update URL to final target)

| Temple | Field | URL | → Location |
|---|---|---|---|
| Shree Jagannath Temple, Puri | officialWebsite | https://shreejagannatha.in | https://www.shreejagannatha.in/ |
| Shree Jagannath Temple, Puri | officialBookingUrl | https://shreejagannatha.in/online-donation-2 | https://www.shreejagannatha.in/online-donation-2 |
| Sri Harmandir Sahib (Golden Temple) | officialBookingUrl | https://sgpc.net/sri-harmandir-sahib | https://sgpc.net/sri-harmandir-sahib/ |
| Shri Badrinath Dham | officialWebsite | https://badrinath-kedarnath.gov.in | https://badrinath-kedarnath.gov.in/errorpage.htm |
| Shri Badrinath Dham | officialBookingUrl | https://www.badrinath-kedarnath.gov.in/ | http://badrinath-kedarnath.gov.in/errorpage.htm |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialWebsite | https://dwarkadhish.org | https://www.dwarkadhish.org/ |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialBookingUrl | https://dwarkadhish.org | https://www.dwarkadhish.org/ |
| Shri Dwarkadhish Temple (Jagat Mandir) | officialDarshanBookingUrl | https://dwarkadhish.org | https://www.dwarkadhish.org/ |

