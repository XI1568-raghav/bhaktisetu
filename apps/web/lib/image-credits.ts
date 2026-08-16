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
  { subject: 'Hanuman Chalisa, printed edition', file: 'Hanuman_Chalisa_4x3.jpg', author: 'RahulKSaini', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
  { subject: 'Homemade pure ghee, Maharashtra', file: 'Pure_Ghee-Homemade-Maharashtra.jpg', author: 'Phadke09', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', attributionRequired: true },
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
