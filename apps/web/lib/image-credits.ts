/**
 * Attribution register for every Wikimedia Commons file this app displays.
 * ========================================================================
 *
 * CM-08 — the licensing half.
 *
 * `lib/images.ts` hotlinks 70 distinct Commons files. 53 of them are under a
 * licence whose `AttributionRequired` flag is `true` on Commons: CC BY, CC BY-SA
 * and GFDL all oblige the re-user to name the author and the licence. Displaying
 * them with no credit is not a style problem, it is the licence condition going
 * unmet — and the product does it on the pages that ask for money, where the
 * photographs are presented as product shots.
 *
 * The `/credits` page carried 57 rows, and the two sets did not line up:
 *
 *   - 14 referenced files had NO row at all. 11 of those 14 are
 *     attribution-required, and 13 of the 14 are `IMAGES.store` product photos —
 *     exactly the surface CM-08 named.
 *   - 1 row (`MKJNTemple.jpg`) credited a file the app stopped referencing when
 *     HN-05 replaced the dead Mallikarjuna hotlink. Its replacement,
 *     `Night_view_of_Srisailam_Temple_South_Gopuram.jpg` (CC BY 4.0), arrived
 *     with no credit of its own, so that fix silently traded a broken image for
 *     an uncredited one.
 *
 * Nothing in the app could notice either drift, because the credit list lived as
 * literal JSX inside the page. It lives here instead so a machine can compare it
 * against `lib/images.ts`; `__tests__/cm08-commons-attribution.test.ts` fails the
 * build when a referenced file has no row, or a row names a file nothing
 * references.
 *
 * SECOND SOURCE, added 2026-08-19 — `lib/images.ts` is not the only route from a
 * Commons URL to an `<img>`. The temple grid never consults it for photographs:
 * `app/temples/page.tsx:43-51,86,169` paints `firstImageUrl(t.images)` straight
 * off the API's temple rows, whose `images` arrays are written by
 * `apps/api/prisma/seed.ts`. That seed hotlinks 68 distinct Commons files and 55
 * of them had no row here — 41 attribution-required — so the first pass closed
 * the hardcoded half of the licensing problem and left the database half open.
 * Those 55 rows are grouped at the bottom of this list and joined against the
 * seed by `__tests__/cm08-seeded-commons-attribution.test.ts`.
 *
 * PROVENANCE — every `author`, `license` and `licenseUrl` below was read from
 * the Commons `imageinfo` / `extmetadata` API on 2026-08-16, not transcribed by
 * hand and not inferred from the file name. When a row has to change, re-read it
 * from the same place:
 *
 *   https://commons.wikimedia.org/w/api.php?action=query&format=json
 *     &prop=imageinfo&iiprop=extmetadata
 *     &iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl|AttributionRequired
 *     &titles=File:<name>
 *
 * Guessing a name here is worse than leaving the image out: it publishes a false
 * statement about someone else's authorship.
 */

export interface CommonsCredit {
  /** Human-readable subject, shown to the reader. */
  subject: string;
  /** DECODED Commons file name — the join key against `lib/images.ts` URLs. */
  file: string;
  /** `extmetadata.Artist`, tags stripped. Empty only where Commons has none. */
  author: string;
  /** `extmetadata.LicenseShortName`, e.g. "CC BY-SA 4.0". */
  license: string;
  /** `extmetadata.LicenseUrl`. Empty for bare public-domain files, which have none. */
  licenseUrl: string;
  /** `extmetadata.AttributionRequired` — true where the licence compels a credit. */
  attributionRequired: boolean;
}

export const COMMONS_CREDITS: readonly CommonsCredit[] = [
  // ── Jyotirlingas ────────────────────────────────────────────
  { subject: 'Somnath Temple', file: 'Somanath_mandir_(cropped).jpg', author: 'B. SurajPatro1997', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  // HN-05 replaced the delisted MKJNTemple.jpg with this photo of the shrine's
  // south gopuram; it is CC BY 4.0, so it needs a credit the old row never gave.
  { subject: 'Mallikarjuna Jyotirlinga, Srisailam (south gopuram)', file: 'Night_view_of_Srisailam_Temple_South_Gopuram.jpg', author: 'Adityamadhav83', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', attributionRequired: true },
  { subject: 'Mahakaleshwar Temple, Ujjain', file: 'Mahakaleshwar_Temple,_Ujjain.jpg', author: 'Ashverse', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Omkareshwar Jyotirlinga', file: 'Omkareswar_Jyotirlinga.jpg', author: 'Deveshc92', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', attributionRequired: true },
  { subject: 'Kedarnath Temple', file: 'Kedarnath_Temple_in_Rainy_season.jpg', author: 'Shivam Kumar 766', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Bhimashankar Temple', file: 'Bhimashankar.jpg', author: 'SaurabhJain', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Kashi Vishwanath', file: 'Kashi_Vishwanath.jpg', author: 'Architkumar1234', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Trimbakeshwar Temple', file: 'Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg', author: 'Abhideo21', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Baidyanath (Vaidyanath) Temple, Deoghar', file: 'Baidyanath_temple_and_temple_complex,_Deoghar_04.jpg', author: 'Pinakpani', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', attributionRequired: true },
  { subject: 'Nageshwar Jyotirlinga', file: 'Nageshwar.JPG', author: 'Bkjit', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Ramanathaswamy (Rameshwaram) Temple', file: 'Ramanathaswamy_temple7.JPG', author: 'Ssriram mt', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Grishneshwar Temple', file: 'Grishneshwar_temple_in_Aurangabad_district.jpg', author: 'Rashmi.parab', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },

  // ── Char Dham ───────────────────────────────────────────────
  { subject: 'Yamunotri Temple', file: 'Yamunotri_temple_and_ashram.jpg', author: 'Atarax42', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Gangotri Temple', file: 'Gangotri_Temple_2.jpg', author: 'Arupamdas', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Badrinath Temple', file: 'Badrinath_Temple_,_Uttarakhand.jpg', author: 'Anubha khare', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },

  // ── Other temples ───────────────────────────────────────────
  { subject: 'Tirumala Tirupati Balaji', file: 'Tirumala_090615.jpg', author: 'Nikhilb239', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Jagannath Temple, Puri', file: 'Shri_Jagannath_temple.jpg', author: 'Prachites', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Siddhivinayak Temple, Mumbai', file: 'Shree_Siddhivinayak_Temple_Mumbai.jpg', author: 'Darwininan', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Akshardham, Delhi', file: 'Swaminarayan_Akshardham,_Delhi.jpg', author: 'sonani', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Meenakshi Amman Temple, Madurai', file: 'An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg', author: 'எஸ்ஸார்', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0', attributionRequired: true },
  { subject: 'Golden Temple, Amritsar', file: 'The_Golden_Temple_of_Amrithsar_7.jpg', author: 'Shagil Kannur', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Vrindavan', file: 'Vrindavan,_India_(21178969102).jpg', author: 'Aleksandr Zykov', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', attributionRequired: true },
  { subject: 'Dwarakadheesh Temple', file: 'Dwarakadheesh_Temple,_2014.jpg', author: 'Vishnupranay.k', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Mata Vaishno Devi Bhawan', file: 'Vaishno_Devi_Bhawan.jpg', author: 'Raulcaeser', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },

  // ── Deities ─────────────────────────────────────────────────
  { subject: 'Lord Shiva (Bangalore)', file: 'Bangalore_Shiva.jpg', author: 'Indianhilbilly', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Lord Ganesha (Basohli miniature, c.1730)', file: 'Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg', author: 'Anonymous', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Lord Krishna lifts Mount Govardhan', file: 'Krishna_Holds_Up_Mount_Govardhan_(MET_70694)_cropped.png', author: 'Mughal artist (c.1590)', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Lord Rama with arrows', file: 'Lord_Rama_with_arrows.jpg', author: 'Unknown', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Standing Hanuman (Chola Dynasty, 11th century)', file: 'StandingHanumanCholaDynasty11thCentury.jpg', author: 'PHGCOM', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Vishnu (Gita Govinda)', file: 'Vishnu_from_Gita_Govinda.jpg', author: 'Manaku of Guler', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Surya with Adityas', file: 'Surya_with_Adityas_and_attendants.jpg', author: 'Unknown', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Goddess Lakshmi (Raja Ravi Varma, 1896)', file: 'Raja_Ravi_Varma,_Goddess_Lakshmi,_1896.jpg', author: 'Raja Ravi Varma', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Goddess Durga (Mahishasura-Mardini)', file: 'Mahishasura-Mardini_Durga.jpg', author: 'Sri Shilpi Siddanthi Siddalinga Swami', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Goddess Saraswati', file: 'Saraswati.jpg', author: 'Raja Ravi Varma', license: 'Public domain', licenseUrl: '', attributionRequired: false },

  // ── Festivals ───────────────────────────────────────────────
  { subject: 'Diwali — Rangoli of Lights', file: 'The_Rangoli_of_Lights.jpg', author: 'Subharnab Majumdar', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', attributionRequired: true },
  { subject: 'Holi Festival of Colors', file: 'Holi_Festival_of_Colors.jpg', author: 'Ramesh Lalwani', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', attributionRequired: true },
  { subject: 'Shardiya Navratri Festival, Pune 2020', file: 'Shardiya_Navratri_Festival_in_Pune_2020.jpg', author: 'आर्या जोशी', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Khairathabad Vinayakudu (Ganesh Chaturthi 2021)', file: 'Khairathabad_Vinayakudu_2021.jpg', author: 'Batthini Vinay Kumar Goud', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Mahashivratri Festival', file: '02_Mahashivratree_festival.JPG', author: 'Navneesh Ramessur', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Yashoda and Krishna (Janmashtami)', file: 'Yesoda-krishna.jpg', author: 'Raja Ravi Varma', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Rakhi (Raksha Bandhan)', file: 'Rakhi_1.JPG', author: 'ସରୋଜ କୁମାର ବେହେରା', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Janakpur Chhath Parva Festival', file: 'JanakpurChhathParvaFestival.jpg', author: 'Steffen Gauger', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },

  // ── Pujas / rituals / content ───────────────────────────────
  { subject: 'Abhisheka (Rudrabhishek)', file: 'From_Abhisheka_To_Panchamrutha.jpg', author: 'Harsha K R', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', attributionRequired: true },
  { subject: 'Priest performing Homa (Havan)', file: 'Priest_performing_Homa.jpg', author: 'Arumuga Manivelu', license: 'GFDL', licenseUrl: 'http://www.gnu.org/copyleft/fdl.html', attributionRequired: true },
  { subject: 'Aarti Thali (Prayer Plate)', file: '(1)_Aarti_Thali,_Prayer_Plate_India.jpg', author: 'Pramal', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', attributionRequired: true },
  { subject: 'Gayatri Japa (Mantra)', file: 'Gayatri_japa.jpg', author: 'Mrs. S. C. Belnos', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Navaratri Bhajan', file: 'Navaratri_Bajan.jpg', author: 'Bootervijay', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Sannyasi in yoga meditation, Rishikesh', file: '1_Sannyasi_in_yoga_meditation_on_the_Ganges,_Rishikesh_cropped.jpg', author: 'Ken Wieland', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', attributionRequired: true },

  // ── Gaushala / cows ─────────────────────────────────────────
  { subject: 'Gir breed cow', file: 'Gir_cow.jpg', author: 'Jayan.thanal', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Sahiwal breed cow', file: 'Sahiwala_01.JPG', author: 'Pavanaja', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Tharparkar breed cow', file: 'Tharparkar_01.JPG', author: 'Pavanaja', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Red Sindhi cow', file: 'Red_Sindhi_Cow_at_Pakistan.jpg', author: 'LunaticFringe97', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Surabhi cow, Vrindavan', file: 'Surabhi_Cow_Vrindavan.jpg', author: 'GourangaUK', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Goshala at ISKCON Mayapur', file: 'Goshala-ISKCON.jpg', author: 'Lakshmikanta Manna', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Calf in Tripura', file: 'A_beautiful_gaze.jpg', author: 'Cosmicsilverfox', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Cows grazing in a field', file: 'A_beautiful_photo_of_cows_grazing_in_the_field.jpg', author: 'Samir8609', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Women washing a cow at a river in Rajasthan', file: 'ILRI,_Stevie_Mann_-_Women_washing_and_cow_drinking_at_a_river_in_Rajasthan,_India.jpg', author: 'ILRI / Stevie Mann', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', attributionRequired: true },

  // ── Store products ──────────────────────────────────────────
  // These 13 shipped with no credit of any kind while being presented as
  // product photography on the paid storefront. Ten of the thirteen are
  // attribution-required, `Rudraksha_mala.jpg` among them — the 5.58 MB file
  // CM-08 was measuring when it was filed.
  { subject: 'Brass puja thali', file: 'Hindu_pooja_thali.jpg', author: 'suketdedhia', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Brass aarti diya', file: 'Indian_Arati_diya.jpg', author: 'Amitbsws', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Puja bell (ghanti)', file: 'GHANTI.jpg', author: 'श्रेष्ठ भूपेन्द्र', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Rudraksha mala', file: 'Rudraksha_mala.jpg', author: 'Janak Bhatta', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Tulsi japa mala, 108 beads', file: 'Japa_mala_(prayer_beads)_of_Tulasi_wood_with_108_beads_-_20040101-01.jpg', author: 'GourangaUK.', license: 'CC BY-SA 2.5', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5', attributionRequired: true },
  { subject: 'Marble Dagadusheth Halwai Ganapati murti', file: 'Marble_Dagadusheth_Halwai_Ganapati_Statue_from_Maliyas.com_Jaipur_India.jpg', author: 'Maliyas.com', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  // Commons leaves `Artist` empty on the Wellcome and LACMA transfers; the
  // institution is the credit line their own Credit field gives. Naming an
  // individual here would be an invention.
  { subject: 'Brass Krishna murti playing the flute', file: 'Brass_standing_figure_of_Krishna_playing_the_flute._Wellcome_M0012566.jpg', author: 'Wellcome Collection', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', attributionRequired: true },
  { subject: 'Shri Lakshmi idol (LACMA M.87.210)', file: 'The_Hindu_Goddess_Shri_Lakshmi_LACMA_M.87.210_(1_of_2).jpg', author: 'Los Angeles County Museum of Art', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Navratri kalash puja', file: 'Navratri_Kalash_Puja.jpg', author: 'Ashish Suryavanshi858', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Havan fire (havanam)', file: '(A)_puja_fire,_Havanam.jpg', author: 'Ravigopal Kesari', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', attributionRequired: true },
  { subject: 'Bhagavad Gita, printed edition', file: 'Bhagavad_Gita_book_(small)_01.jpg', author: 'Gpkp', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  // CM-08 2026-09-01: the subject line used to read "Hanuman Chalisa, printed
  // edition", which is not what the file shows. It is a poster graphic of the
  // Chalisa text with a third-party design studio's watermark and phone number
  // burnt into the frame, and this page's job is to describe the file
  // accurately. The product-card side of that problem is recorded at the
  // 'hanuman-chalisa-book' entry in lib/images.ts and needs a photograph.
  { subject: 'Hanuman Chalisa text (poster graphic)', file: 'Hanuman_Chalisa_4x3.jpg', author: 'RahulKSaini', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  // Read from the Commons imageinfo/extmetadata API on 2026-09-01, like every
  // other row here. Replaces the duplicated Hanuman Chalisa poster on the
  // 'sunderkand-book' SKU: the Sunderkand is the Ramcharitmanas' fifth kanda,
  // and this is a photograph of a printed Ramcharitmanas.
  { subject: 'Ramcharitmanas, printed edition', file: 'Ramcharitmanas_book.jpg', author: 'Wikilover90', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Homemade pure ghee, Maharashtra', file: 'Pure_Ghee-Homemade-Maharashtra.jpg', author: 'Phadke09', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },

  // ── Seeded via apps/api/prisma/seed.ts (DATABASE-sourced) ───
  // These 55 files never appear in lib/images.ts. They reach the screen from
  // the temples / puja_types tables: apps/api/prisma/seed.ts writes them into
  // each row's `images` array, the API returns that array, and
  // app/temples/page.tsx:43-51,86,169 paints `firstImageUrl(t.images)` as the
  // card photograph. The register's first join only ever looked at
  // lib/images.ts, so all 55 shipped uncredited — 41 of them attribution-
  // required. Provenance read from the Commons imageinfo/extmetadata API on
  // 2026-08-19 via the query documented at the top of this file.
  //
  // Where Commons' `Artist` is a boilerplate blob rather than a name, the name
  // inside it is used and nothing else is invented: the two PlaneMad files
  // carry a licence-negotiation paragraph that itself says to "credit the
  // photo CC-by-sa PlaneMad"; `Vaishno_devi.jpg` and
  // `East_Gopura_of_Rameswaram_Temple.jpg` carry "No machine-readable author
  // provided. <name> assumed (based on copyright claims).";
  // `Vaishno_Devi_Navratras.jpg` has NO Artist at all and its `Credit` field is
  // https://www.maavaishnodevi.org/ — the shrine board's own site — so that
  // stated source is the credit line rather than a guessed photographer.
  { subject: 'Akshardham Temple — Akshardham Delhi Ricky W', file: 'Akshardham_Delhi_Ricky_W.jpg', author: 'Ricky W.', license: 'CC BY 2.5', licenseUrl: 'https://creativecommons.org/licenses/by/2.5', attributionRequired: true },
  { subject: 'Akshardham Temple — Akshardham Dome', file: 'Akshardham_Dome.jpg', author: 'World', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Badrinath Temple — Badri Night', file: 'Badri_Night.JPG', author: 'Raji.srinivas', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Birla Mandir Hyderabad — Birla Mandir, Hyderabad', file: 'Birla_Mandir,_Hyderabad.png', author: 'Nikhilb239', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', attributionRequired: true },
  { subject: 'Birla Mandir Hyderabad — Birla Temple no 1', file: 'Birla_Temple_no_1.jpg', author: 'Karthik Easvur', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Birla Mandir Hyderabad — BirlaMandir', file: 'BirlaMandir.jpg', author: 'Naveenji', license: 'CC BY-SA 3.0', licenseUrl: 'http://creativecommons.org/licenses/by-sa/3.0/', attributionRequired: true },
  { subject: 'Dagdusheth Halwai Ganpati Temple — Dagadusheth Halwai Ganpati Temple illuminated 2', file: 'Dagadusheth_Halwai_Ganpati_Temple_illuminated_2.jpg', author: 'DesiBoy101', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', attributionRequired: true },
  { subject: 'Dakshineswar Kali Temple — Dakhineshwar Temple beside the Hoogly, West Bengal', file: 'Dakhineshwar_Temple_beside_the_Hoogly,_West_Bengal.JPG', author: 'Knath', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Dakshineswar Kali Temple — Dakshineswar Kali Temple on the bank River Ganges', file: 'Dakshineswar_Kali_Temple_on_the_bank_River_Ganges.jpg', author: 'Provatkrmukherjee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Dwarkadhish Temple — Dwarakadheesh temple, Dwaraka', file: 'Dwarakadheesh_temple,_Dwaraka.jpg', author: 'emmanueldyan (Flickr)', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', attributionRequired: true },
  { subject: 'Dwarkadhish Temple — Dwarka Mandir', file: 'Dwarka_Mandir.jpg', author: 'Abhishek K Saxena', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Govind Dev Ji Temple — Govind Dev Ji Temple Inner Side', file: 'Govind_Dev_Ji_Temple_Inner_Side.jpg', author: 'Anildiggiwal', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Govind Dev Ji Temple — Govind Dev Ji Temple, Jaipur, 20191218 1059 9091', file: 'Govind_Dev_Ji_Temple,_Jaipur,_20191218_1059_9091.jpg', author: 'Jakub Hałun', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Govind Dev Ji Temple — Govind dev ji', file: 'Govind_dev_ji.jpg', author: 'Sameergoyal', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Hanuman Chalisa Path — Hanuman Chalisa img', file: 'Hanuman_Chalisa_img.jpg', author: 'Ashish.akm', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'ISKCON Bangalore (Sri Radha Krishna-Chandra Mandir) — Entrance of Iskcon temple', file: 'Entrance_of_Iskcon_temple.jpg', author: 'KeralianEditor', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'ISKCON Bangalore (Sri Radha Krishna-Chandra Mandir) — ISKCON Banglaore Temple', file: 'ISKCON_Banglaore_Temple.jpg', author: 'Svpdasa', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0', attributionRequired: true },
  { subject: 'ISKCON Bangalore (Sri Radha Krishna-Chandra Mandir) — Iskon temple', file: 'Iskon_temple.JPG', author: 'hemant meena', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Jagannath Temple — Bird view of Jagannath Temple, Puri', file: 'Bird_view_of_Jagannath_Temple,_Puri.jpg', author: 'Government of Odisha', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', attributionRequired: true },
  { subject: 'Jagannath Temple — Rath Yatra Puri 07-11027', file: 'Rath_Yatra_Puri_07-11027.jpg', author: 'G.-U. Tolkiehn', license: 'CC BY 2.5', licenseUrl: 'https://creativecommons.org/licenses/by/2.5', attributionRequired: true },
  { subject: 'Jagannath Temple — Singhadwara', file: 'Singhadwara.jpg', author: 'Unknown', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Kapaleeshwarar Temple — Kapaleeshwarar Temple. Chennai. 2010', file: 'Kapaleeshwarar_Temple._Chennai._2010.jpg', author: 'John Hill', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Kapaleeshwarar Temple — Kapaleeswarar1', file: 'Kapaleeswarar1.jpg', author: 'Mohan Krishnan', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Kapaleeshwarar Temple — Mylapore Kapaleeshwarar temple facade', file: 'Mylapore_Kapaleeshwarar_temple_facade.jpg', author: 'PlaneMad', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Kapaleeshwarar Temple — Mylapore tank at dawn panorama', file: 'Mylapore_tank_at_dawn_panorama.jpg', author: 'PlaneMad', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Kashi Vishwanath Temple — Annapurna Entrance of kashi vishwanath temple', file: 'Annapurna_Entrance_of_kashi_vishwanath_temple.jpg', author: 'Gamerzer', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Kashi Vishwanath Temple — Ganga Dwar, Gateway of Corridor of Kashi Vishwanath Temple, Varanasi 2', file: 'Ganga_Dwar,_Gateway_of_Corridor_of_Kashi_Vishwanath_Temple,_Varanasi_2.webp', author: 'Ashvin Kaitabhya, clicked by Abhishek Pandey', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Lingaraj Temple — 11th century Lingaraja temple, Bhubaneswar Odisha India', file: '11th_century_Lingaraja_temple,_Bhubaneswar_Odisha_India.jpg', author: 'Ms Sarah Welch', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Lingaraj Temple — Lingaraj Temple complex at dusk during Shivratri 2020', file: 'Lingaraj_Temple_complex_at_dusk_during_Shivratri_2020.jpg', author: 'Government of Odisha', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', attributionRequired: true },
  { subject: 'Lingaraj Temple — Lingaraj Temple Complex', file: 'Lingaraj_Temple_Complex.jpg', author: 'Puja Rakshit', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Lingaraj Temple — Lingaraj Temple, Bhubaneswar', file: 'Lingaraj_Temple,_Bhubaneswar.jpg', author: 'SUDEEP PRAMANIK', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Maha Mrityunjay Jaap — 1 Om', file: '1_Om.svg', author: 'The Unicode Consortium', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Meenakshi Amman Temple — India Meenakshi Temple', file: 'India_Meenakshi_Temple.jpg', author: 'Ashok666', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', attributionRequired: true },
  { subject: 'Meenakshi Amman Temple — Madurai Meenakshi temple shikhara', file: 'Madurai_Meenakshi_temple_shikhara.jpg', author: 'fraboof (Flickr)', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', attributionRequired: true },
  { subject: 'Meenakshi Amman Temple — Meenakshi Amman West Tower', file: 'Meenakshi_Amman_West_Tower.jpg', author: 'KennyOMG', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Navgraha Shanti Puja — Navagraha', file: 'Navagraha.jpg', author: 'Anant Shivaji Desai, Ravi Varma Press', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Pitru Dosh Nivaran Puja — Pinda Daan - Jagannath Ghat - Kolkata 2012-10-15 0701', file: 'Pinda_Daan_-_Jagannath_Ghat_-_Kolkata_2012-10-15_0701.JPG', author: 'Biswarup Ganguly', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0', attributionRequired: true },
  { subject: 'Ram Charit Manas Path — Rāmacaritamānasa manuscript (19th century)', file: 'Rāmacaritamānasa_manuscript_(19th_century).png', author: 'Jānak De (scribe)', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Ramanathaswamy Temple — 43Rameswaram The Great Corridor', file: '43Rameswaram_The_Great_Corridor.jpg', author: 'Messrs. Nicholas & Co', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Ramanathaswamy Temple — East Gopura of Rameswaram Temple', file: 'East_Gopura_of_Rameswaram_Temple.jpg', author: 'Vinayaraj', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Ramanathaswamy Temple — Rameswaram temple (11)', file: 'Rameswaram_temple_(11).jpg', author: 'Vinayaraj', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Satyanarayan Katha — Devotees', file: 'Devotees.jpg', author: 'Unknown', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Shirdi Sai Baba Samadhi Temple — Sai baba samadhi mandir', file: 'Sai_baba_samadhi_mandir_.jpg', author: 'Sanskar RM Khatri', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Shirdi Sai Baba Samadhi Temple — Sai gold full', file: 'Sai_gold_full.jpg', author: 'Amolthefriend', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Somnath Temple — Ancient Somnath temple, Veraval Gujarat', file: 'Ancient_Somnath_temple,_Veraval_Gujarat.jpg', author: 'Ms Sarah Welch', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Somnath Temple — Somanath Temple', file: 'Somanath_Temple.jpg', author: 'B. SurajPatro1997', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Sunderkand Path — Hanuman\'s visit, in bazaar art with a Marathi caption, early 1900s', file: 'Hanuman\'s_visit,_in_bazaar_art_with_a_Marathi_caption,_early_1900s.jpg', author: 'bazaar art', license: 'Public domain', licenseUrl: '', attributionRequired: false },
  { subject: 'Swaminarayan Akshardham Gandhinagar — Akshardham Gandhinagar Gujarat', file: 'Akshardham_Gandhinagar_Gujarat.jpg', author: 'Harsh4101991', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
  { subject: 'Tirumala Tirupati Devasthanam — Sri vari swarana radham879', file: 'Sri_vari_swarana_radham879.jpg', author: 'Phanidharvaranasi', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Tirumala Tirupati Devasthanam — Tirumala Venkateswara temple entrance 09062015', file: 'Tirumala_Venkateswara_temple_entrance_09062015.JPG', author: 'Nikhilb239', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Tirumala Tirupati Devasthanam — Tirumala View from srivari padalu', file: 'Tirumala_View_from_srivari_padalu.jpg', author: 'Phanidharvaranasi', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Vaishno Devi Bhawan — Snowfall in Vaishno Devi', file: 'Snowfall_in_Vaishno_Devi.jpg', author: 'Yatin. 123', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Vaishno Devi Bhawan — Vaishno Devi Bhawan Facade Lighting', file: 'Vaishno_Devi_Bhawan_Facade_Lighting.jpg', author: 'Unknown', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', attributionRequired: false },
  { subject: 'Vaishno Devi Bhawan — Vaishno Devi Navratras', file: 'Vaishno_Devi_Navratras.jpg', author: 'maavaishnodevi.org', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0', attributionRequired: true },
  { subject: 'Vaishno Devi Bhawan — Vaishno devi', file: 'Vaishno_devi.jpg', author: 'Raju hardoi', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', attributionRequired: true },
];

/** Canonical Commons description page for a file — where the full licence lives. */
export function commonsSourcePage(file: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file).replace(/%2F/g, '/')}`;
}

/**
 * The decoded Commons file name inside an `upload.wikimedia.org` URL, for both
 * the bare-original and the `/thumb/` shapes. `undefined` for any other host,
 * which is how a non-Commons URL is told apart from an uncredited one.
 */
export function commonsFileFromUrl(url: string): string | undefined {
  const m = /\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/.exec(url);
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

const BY_FILE: ReadonlyMap<string, CommonsCredit> = new Map(
  COMMONS_CREDITS.map((c) => [c.file, c]),
);

/** The credit row for a Commons URL, or `undefined` if the file has none. */
export function creditForUrl(url: string): CommonsCredit | undefined {
  const file = commonsFileFromUrl(url);
  return file ? BY_FILE.get(file) : undefined;
}

/**
 * One-line credit suitable for a caption or a `title` attribute:
 * `"Kashi Vishwanath — Architkumar1234, CC BY-SA 4.0"`.
 */
export function creditLine(credit: CommonsCredit): string {
  const who = credit.author.trim() || 'Unknown author';
  return `${credit.subject} — ${who}, ${credit.license}`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * CM-08, THIRD SOURCE — files we HOST, added 2026-08-21.
 *
 * The two joins above both describe HOTLINKS: `lib/images.ts` and the seeded
 * `temples.images` arrays point a browser at upload.wikimedia.org, and the
 * bytes are served by Wikimedia with the file's own provenance attached.
 *
 * `apps/web/public/` is different in kind. Those bytes are served by
 * darshya.online, which makes us the distributor, and a licence's conditions
 * bind the distributor directly. Nothing in this repo had ever recorded where
 * such a file came from, and one of them is a third-party photograph:
 *
 *   public/images/golden-temple-og.jpg  1200x630, 136,622 B
 *     = a CROP of File:The_Golden_Temple_of_Amrithsar_7.jpg
 *       (Commons imageinfo 2026-08-21: 4176x2784 = 1.50:1, Shagil Kannur,
 *        CC BY-SA 4.0, AttributionRequired: true)
 *     introduced by 73943b61, whose commit body itself calls it a "CC-SA
 *     Wikimedia asset", and named as og:image / twitter:image by ~100 route
 *     files. `sharp(...).metadata()` on the shipped file reported
 *     `exif: false, icc: false` and no comment segment: the artifact that
 *     Facebook, X, LinkedIn and WhatsApp fetch and re-host named no author,
 *     no licence, no source, and did not say it had been modified.
 *
 * 1.50:1 -> 1.905:1 is not a resize, it is an ADAPTATION, so CC BY-SA 4.0
 * 3(b)(1) also applies: the adapted card must carry the same licence. A
 * preview card in a WhatsApp thread cannot reach /credits, so the credit has
 * to live in the file. `commonsAttributionText()` below is that credit, and
 * `__tests__/cm08-self-hosted-image-attribution.test.ts` reads it back out of
 * the bytes on disk — and fails when any raster in public/ has no row here, so
 * the next downloaded photograph cannot repeat 73943b61.
 * ═════════════════════════════════════════════════════════════════════════ */

export interface SelfHostedImage {
  /** POSIX path under `apps/web/public`, with a leading slash. */
  path: string;
  /**
   * `original`   — artwork made for Darshya; no third-party rights.
   * `screenshot` — a capture of our own UI. Any third-party photograph inside
   *                the frame is a hotlink credited on /credits.
   * `commons`    — a copy or derivative of a Wikimedia Commons file. We are
   *                the distributor, so the licence binds us directly.
   */
  origin: 'original' | 'screenshot' | 'commons';
  /** `commons` only: the Commons file. Must have a COMMONS_CREDITS row. */
  commonsFile?: string;
  /** `commons` only: what we changed — CC BY(-SA) 4.0 3(a)(1)(B). */
  modification?: string;
  /** Why the file exists / where it is used. */
  note?: string;
}

export const SELF_HOSTED_IMAGES: readonly SelfHostedImage[] = [
  {
    path: '/images/golden-temple-og.jpg',
    origin: 'commons',
    commonsFile: 'The_Golden_Temple_of_Amrithsar_7.jpg',
    modification:
      'cropped from 4176x2784 to 1200x630, re-encoded as JPEG and given a visible credit line',
    note: 'og:image / twitter:image for ~100 routes. Self-hosted by 73943b61 because Wikimedia 429s a link-audit burst.',
  },
  {
    path: '/og/default.png',
    origin: 'original',
    note: 'Brand share card: flat saffron gradient, wordmark, three pill labels, translucent Om glyph. Site-wide og:image default.',
  },
  {
    path: '/og/nri-premium.jpg',
    origin: 'original',
    note: 'Brand share card for /nri and /nri/ca. Same gradient system as og/default.png.',
  },
  { path: '/logo.png', origin: 'original', note: 'Darshya shikhara-and-flame mark.' },

  // Pitch-deck captures of our own UI (apps/remotion-pitch consumes these).
  // Third-party photographs appear inside the frames as rendered page content;
  // those files are hotlinks credited in COMMONS_CREDITS above.
  { path: '/pitch/img/01-home-hero.png', origin: 'screenshot' },
  { path: '/pitch/img/01-home-scroll.png', origin: 'screenshot' },
  { path: '/pitch/img/02-temples-grid.png', origin: 'screenshot' },
  { path: '/pitch/img/03-temple-detail.png', origin: 'screenshot' },
  { path: '/pitch/img/04-pujas-grid.png', origin: 'screenshot' },
  { path: '/pitch/img/05-puja-detail.png', origin: 'screenshot' },
  { path: '/pitch/img/06-darshan.png', origin: 'screenshot' },
  { path: '/pitch/img/07-panchang.png', origin: 'screenshot' },
  { path: '/pitch/img/08-astrology.png', origin: 'screenshot' },
  { path: '/pitch/img/09-gaushala.png', origin: 'screenshot' },
  { path: '/pitch/img/10-store.png', origin: 'screenshot' },
  { path: '/pitch/img/11-yatra.png', origin: 'screenshot' },
  { path: '/pitch/img/12-ai-chat-input.png', origin: 'screenshot' },
];

/**
 * The attribution a self-hosted Commons derivative must carry INSIDE its own
 * bytes, so it survives being fetched and re-hosted by a scraper.
 *
 * Covers all four obligations in one string: creator and licence (3(a)(1)(A)),
 * a link to the licence and to the material (3(a)(1)(A)(iii)/(iv)), the fact
 * that the work was modified (3(a)(1)(B)), and — for a ShareAlike source —
 * the same licence on the adaptation (3(b)(1)).
 *
 * Throws rather than degrading: a silent `undefined` here would produce a file
 * that looks credited and is not.
 */
export function commonsAttributionText(entry: SelfHostedImage): string {
  if (entry.origin !== 'commons' || !entry.commonsFile) {
    throw new Error(`commonsAttributionText: ${entry.path} is not a Commons derivative`);
  }
  const row = BY_FILE.get(entry.commonsFile);
  if (!row) {
    throw new Error(
      `commonsAttributionText: ${entry.commonsFile} has no COMMONS_CREDITS row, so ` +
        'this derivative would ship crediting nobody.',
    );
  }
  const who = row.author.trim() || 'Unknown author';
  const parts = [
    `Photograph: ${who}.`,
    `Source: ${commonsSourcePage(row.file)}`,
    row.licenseUrl ? `Licence: ${row.license} (${row.licenseUrl}).` : `Licence: ${row.license}.`,
    `Modified by Darshya (https://darshya.online): ${entry.modification ?? 'unspecified'}.`,
  ];
  if (/BY-SA|GFDL/i.test(row.license)) {
    parts.push(`This adapted image is also released under ${row.license} (ShareAlike).`);
  }
  return parts.join(' ');
}
