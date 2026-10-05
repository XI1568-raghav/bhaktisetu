/**
 * Centralized Image Map for Darshya
 * =====================================
 * All image URLs used across the application are defined here.
 * Import from this file instead of hardcoding URLs in components.
 *
 * Sources:
 * - Famous temples, deities, festivals, pujas → Wikimedia Commons (real photos
 * of the actual subject; CC-BY-SA / CC-BY / public domain). See /credits.
 * - Generic store products, profile photos, abstract backgrounds → Unsplash
 * (stock photography, free to use).
 *
 * Usage:
 * import { IMAGES, getTempleHero } from '@/lib/images';
 * <img src={getTempleHero('kashi-vishwanath')} />
 */

import { selfHostedFor, relativizeOwnImage } from './self-hosted-images';

const UNSPLASH_BASE = 'https://images.unsplash.com';

function qualityFor(w: number, h: number): number {
 const max = Math.max(w, h);
 if (max >= 1400) return 85;
 if (max >= 700) return 80;
 if (max >= 300) return 75;
 return 70;
}

function u(photoId: string, w = 800, h = 600): string {
 const q = qualityFor(w, h);
 return `${UNSPLASH_BASE}/${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=${q}`;
}

function uWide(photoId: string): string {
 return u(photoId, 1600, 700);
}

function uSquare(photoId: string, size = 400): string {
 return u(photoId, size, size);
}

function uPortrait(photoId: string): string {
 return u(photoId, 600, 900);
}

/**
 * Pass-through for a Wikimedia Commons URL. Commons serves the original or
 * a /thumb/ variant; both are stable, permanently hosted, and CDN-cached.
 */
function wiki(url: string): string {
 return url;
}

// Wikimedia banned ad-hoc thumb widths in 2024 — only these ladder steps work.
// https://www.mediawiki.org/wiki/Common_thumbnail_sizes
const COMMONS_LADDER = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840] as const;

function snapToLadder(width: number): number {
 // Snap UP to next ladder step so quality never undershoots requested size.
 for (const step of COMMONS_LADDER) {
   if (step >= width) return step;
 }
 return COMMONS_LADDER[COMMONS_LADDER.length - 1]!;
}

/**
 * Source width, in pixels, of every Commons file this app references that is
 * NARROWER than the widest slot asked of it (IMG_W.HERO, 1280). Measured from
 * the Commons `imageinfo` API on 2026-08-15.
 *
 * Commons does not refuse an oversized thumb request — it UPSCALES and answers
 * 200. Measured on Bhimashankar.jpg, a 320x240 file: the 1280px "thumb" is
 * 125,084 bytes, the source file itself is 26,266 bytes, and the 250px thumb
 * is 16,938 bytes. The resize funnel, whose entire purpose is bytes, was
 * therefore shipping 7.4x the bytes of a correct request and a blurred
 * upscale with it. Kashi_Vishwanath.jpg (621x452) is the worst placed of
 * these: it is FALLBACK_IMAGE, the home hero, the temple-card placeholder and
 * the og-image placeholder, and it was being requested at 1280 (160,061 B)
 * where 500 costs 52,125 B.
 *
 * COMPLETENESS IS THE WHOLE MECHANISM — corrected 2026-08-20. This block used
 * to say "Only under-1280 files need a row — anything wider is never
 * overshot", and listed 9 rows. That reasoning is circular: you cannot know a
 * file is wider than 1280 without measuring it, and nothing forced the
 * measurement. Re-read from the Commons `imageinfo` API on 2026-08-20, 17 of
 * the 70 files referenced here are narrower than IMG_W.HERO — the widest slot
 * every getter is exercised at — and 8 of those 17 had no row:
 *
 *   Red_Sindhi_Cow_at_Pakistan.jpg 960 · (1)_Aarti_Thali,_Prayer_Plate_India.jpg
 *   1024 · Dwarakadheesh_Temple,_2014.jpg 1024 · Surabhi_Cow_Vrindavan.jpg 1024
 *   · Ganesha_Basohli_…_p73.jpg 1033 · Raja_Ravi_Varma,_Goddess_Lakshmi,_1896.jpg
 *   1057 · StandingHanumanCholaDynasty11thCentury.jpg 1058 ·
 *   Vishnu_from_Gita_Govinda.jpg 1112
 *
 * Their 1280px thumbs cost 2,764,770 B against 1,684,784 B for the widest step
 * the sources can actually satisfy (HEAD, 2026-08-20) — 1,079,986 B spent
 * making eight images blurrier. `Dwarakadheesh_Temple,_2014.jpg` is
 * `IMAGES.temples['dwarkadhish'].hero`, so `/temples/dwarkadhish` was shipping
 * a 266,721 B upscale where 176,149 B is the real file.
 *
 * The overshoot assertion in `commons-asset-integrity.test.ts` could not catch
 * any of it: it reads `COMMONS_INTRINSIC_WIDTH[file]` and skips the check when
 * the lookup is `undefined`, so a missing row reads as "no violation". The
 * table therefore records EVERY referenced file now, wide ones included, and
 * `cm08-intrinsic-width-completeness.test.ts` fails when a referenced file has
 * no row — which is what makes that older assertion able to fail at all.
 *
 * Keys are the DECODED Commons file name, which is what `ladderWidth` looks
 * up. Values are `imageinfo.width`, read from
 *   https://commons.wikimedia.org/w/api.php?action=query&format=json
 *     &prop=imageinfo&iiprop=size&titles=File:<name>
 * never guessed — a wrong number here silently disables the clamp.
 * `commons-asset-integrity.test.ts` fails if a key here stops being
 * referenced, so the table cannot quietly drift into fiction.
 */
export const COMMONS_INTRINSIC_WIDTH: Readonly<Record<string, number>> = {
 'Bhimashankar.jpg': 320,
 'Mahishasura-Mardini_Durga.jpg': 464,
 'Kashi_Vishwanath.jpg': 621,
 'Krishna_Holds_Up_Mount_Govardhan_(MET_70694)_cropped.png': 720,
 'Yesoda-krishna.jpg': 796,
 'Japa_mala_(prayer_beads)_of_Tulasi_wood_with_108_beads_-_20040101-01.jpg': 800,
 'Navaratri_Bajan.jpg': 800,
 'Swaminarayan_Akshardham,_Delhi.jpg': 800,
 'Saraswati.jpg': 925,
 'Red_Sindhi_Cow_at_Pakistan.jpg': 960,
 '(1)_Aarti_Thali,_Prayer_Plate_India.jpg': 1024,
 'Dwarakadheesh_Temple,_2014.jpg': 1024,
 'Surabhi_Cow_Vrindavan.jpg': 1024,
 'Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg': 1033,
 'Raja_Ravi_Varma,_Goddess_Lakshmi,_1896.jpg': 1057,
 'StandingHanumanCholaDynasty11thCentury.jpg': 1058,
 'Vishnu_from_Gita_Govinda.jpg': 1112,
 'Goshala-ISKCON.jpg': 1280,
 'The_Hindu_Goddess_Shri_Lakshmi_LACMA_M.87.210_(1_of_2).jpg': 1325,
 'Priest_performing_Homa.jpg': 1363,
 'Lord_Rama_with_arrows.jpg': 1366,
 'GHANTI.jpg': 1463,
 'JanakpurChhathParvaFestival.jpg': 1600,
 'Night_view_of_Srisailam_Temple_South_Gopuram.jpg': 1752,
 'A_beautiful_photo_of_cows_grazing_in_the_field.jpg': 1836,
 'Gayatri_japa.jpg': 1903,
 'The_Rangoli_of_Lights.jpg': 1932,
 'Surya_with_Adityas_and_attendants.jpg': 1994,
 'Hindu_pooja_thali.jpg': 2000,
 '1_Sannyasi_in_yoga_meditation_on_the_Ganges,_Rishikesh_cropped.jpg': 2031,
 'Grishneshwar_temple_in_Aurangabad_district.jpg': 2048,
 '02_Mahashivratree_festival.JPG': 2112,
 'Gangotri_Temple_2.jpg': 2272,
 'Yamunotri_temple_and_ashram.jpg': 2304,
 'Indian_Arati_diya.jpg': 2342,
 'Shree_Siddhivinayak_Temple_Mumbai.jpg': 2410,
 'Ramanathaswamy_temple7.JPG': 2448,
 'Brass_standing_figure_of_Krishna_playing_the_flute._Wellcome_M0012566.jpg': 2520,
 'Bangalore_Shiva.jpg': 2560,
 'Omkareswar_Jyotirlinga.jpg': 2560,
 'Nageshwar.JPG': 2571,
 'From_Abhisheka_To_Panchamrutha.jpg': 2592,
 'Vrindavan,_India_(21178969102).jpg': 2848,
 'Khairathabad_Vinayakudu_2021.jpg': 3000,
 'Marble_Dagadusheth_Halwai_Ganapati_Statue_from_Maliyas.com_Jaipur_India.jpg': 3000,
 'Navratri_Kalash_Puja.jpg': 3072,
 'Gir_cow.jpg': 3264,
 'Holi_Festival_of_Colors.jpg': 3456,
 'ILRI,_Stevie_Mann_-_Women_washing_and_cow_drinking_at_a_river_in_Rajasthan,_India.jpg': 3504,
 'Hanuman_Chalisa_4x3.jpg': 3600,
 '(A)_puja_fire,_Havanam.jpg': 3872,
 'Badrinath_Temple_,_Uttarakhand.jpg': 4000,
 'Rudraksha_mala.jpg': 4000,
 'Kedarnath_Temple_in_Rainy_season.jpg': 4073,
 'Baidyanath_temple_and_temple_complex,_Deoghar_04.jpg': 4080,
 'Bhagavad_Gita_book_(small)_01.jpg': 4080,
 'Tirumala_090615.jpg': 4096,
 'Shardiya_Navratri_Festival_in_Pune_2020.jpg': 4128,
 'The_Golden_Temple_of_Amrithsar_7.jpg': 4176,
 'Rakhi_1.JPG': 4272,
 'An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg': 4365,
 'Mahakaleshwar_Temple,_Ujjain.jpg': 4608,
 'Vaishno_Devi_Bhawan.jpg': 4608,
 'Sahiwala_01.JPG': 5184,
 'Tharparkar_01.JPG': 5184,
 // Read from imageinfo on 2026-09-01, same as every other row here.
 'Ramcharitmanas_book.jpg': 5456,
 'Somanath_mandir_(cropped).jpg': 5712,
 'A_beautiful_gaze.jpg': 6000,
 'Pure_Ghee-Homemade-Maharashtra.jpg': 6000,
 'Shri_Jagannath_temple.jpg': 6000,
 'Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg': 6000,
};

/** Commons file names are percent-encoded in URLs; the table is keyed decoded. */
function decodeCommonsFile(encoded: string | undefined): string | undefined {
 if (!encoded) return undefined;
 try {
   return decodeURIComponent(encoded);
 } catch {
   return encoded;
 }
}

/**
 * The ladder step to actually request: snapped UP for quality, then clamped
 * DOWN to the largest step the source file can satisfy without upscaling.
 *
 * The clamp must land on a ladder step, not on the source width — Commons
 * answers HTTP 400 for any off-ladder width (verified: a 621px request for a
 * 621px-wide file returns 400, its 500px request returns 200).
 */
function ladderWidth(requested: number, encodedFile?: string): number {
 const up = snapToLadder(requested);
 const intrinsic = COMMONS_INTRINSIC_WIDTH[decodeCommonsFile(encodedFile) ?? ''];
 if (!intrinsic || up <= intrinsic) return up;
 let down: number = COMMONS_LADDER[0]!;
 for (const step of COMMONS_LADDER) if (step <= intrinsic) down = step;
 return down;
}

/**
 * Convert ANY Wikimedia Commons URL to a thumbnail at the given width.
 * Originals (5-15 MB) become resized thumbnails (50-300 KB) — critical for perf.
 *
 * Width is snapped to the Commons ladder (250/330/500/960/1280/1920) — Commons
 * rejects arbitrary widths with HTTP 400 since 2024 — and then capped at the
 * source file's own width so a small file is never upscaled into a big one.
 *
 * Handles both shapes:
 *   .../commons/a/bc/Foo.jpg          → .../commons/thumb/a/bc/Foo.jpg/<w>px-Foo.jpg
 *   .../commons/thumb/a/bc/Foo.jpg/1280px-Foo.jpg → ...rewritten width
 */
/**
 * CM-08 — PNG is the wrong container for a photograph, and Commons hands this
 * catalogue three of them: a manuscript scan, a museum painting and a temple
 * photo. Commons' own thumbnailer will re-encode a thumbnail into another
 * format when the target extension is appended to the thumb file name
 * (`…/500px-Foo.png` → `…/500px-Foo.png.jpg`), so this costs no infrastructure.
 *
 * Measured 2026-09-01 at the 500px card width, every Commons PNG this repo
 * references (`grep -o "commons/[^\"]*\.png"` across apps/web + apps/api →
 * exactly three files, plus two `.svg`):
 *
 *   Birla_Mandir,_Hyderabad.png                       221,440 B → 33,057 B
 *   Rāmacaritamānasa_manuscript_(19th_century).png    505,253 B → 84,584 B
 *   Krishna_Holds_Up_Mount_Govardhan_(MET_70694).png  663,567 B → 103,456 B
 *   ───────────────────────────────────────────────────────────────────────
 *   total                                           1,390,260 B → 221,097 B  (−84.1%)
 *
 * SAFE BECAUSE THE ALPHA WAS CHECKED, NOT ASSUMED. Each PNG was decoded to a
 * canvas: min alpha 255 and 0 translucent pixels on all three, and the mean
 * absolute channel difference against the JPEG is 2.3 / 4.1 / 3.2 of 255
 * (ordinary JPEG quantisation). `.webp` was measured too and is the worse
 * trade here (505,253 → 332,796 B, only −34%).
 *
 * SVG-DERIVED THUMBS ARE EXCLUDED, and that exclusion is load-bearing:
 * `500px-1_Om.svg.png` is 65% translucent (168,177 of 258,000 px, min alpha 0)
 * and flattening it to JPEG moves pixels by a mean of 162.9/255 — it would
 * paint a white slab where the glyph should float over the card gradient.
 */
function transcodeThumbFile(thumbFile: string): string {
 if (/\.svg\.png$/i.test(thumbFile)) return thumbFile;
 if (/\.png$/i.test(thumbFile)) return `${thumbFile}.jpg`;
 return thumbFile;
}

export function wikiThumb(url: string, width: number): string {
 const local = selfHostedFor(url, width);
 if (local) return local.url;
 if (!url.includes('upload.wikimedia.org/wikipedia/commons/')) return url;
 if (url.includes('/commons/thumb/')) {
   const thumbFile = /\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)\//.exec(url)?.[1];
   const w = ladderWidth(width, thumbFile);
   // Rewrite the width, then transcode the tail. Order matters: the tail of an
   // already-transcoded URL ends `.png.jpg`, which must not pick up a second
   // `.jpg`, so the guard tests the tail as it stands after the width swap.
   const resized = url.replace(/\/(\d+)px-/, `/${w}px-`);
   const tail = /\/(\d+px-[^/?#]+)$/.exec(resized)?.[1];
   if (!tail) return resized;
   return resized.replace(/\/(\d+px-[^/?#]+)$/, `/${transcodeThumbFile(tail)}`);
 }
 const match = url.match(/\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/);
 if (!match) return url;
 const [, a, bc, file] = match;
 const w = ladderWidth(width, file);
 // .svg → .svg.png thumb (Commons rule). Other extensions pass through.
 const thumbFile = /\.svg$/i.test(file!) ? `${file}.png` : file;
 return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${bc}/${file}/${w}px-${transcodeThumbFile(thumbFile!)}`;
}

/**
 * Resize a Wikimedia Commons /thumb/ URL to a different width.
 * Backward compat — prefer wikiThumb which also handles originals.
 */
export function wikiResize(url: string, width: number): string {
 return wikiThumb(url, width);
}

// ────────────────────────────────────────────────────────────
// remoteImage — the single funnel every remote image URL goes through
// ────────────────────────────────────────────────────────────

/**
 * Slot widths, in CSS pixels, for the four shapes this product actually
 * paints. Pass the CSS width of the LARGEST breakpoint the image renders at;
 * the Commons ladder snaps up, which absorbs the DPR headroom.
 *
 *   THUMB 250  avatars, 64-120px chips, content thumbnails
 *   CARD  500  every grid card (store, puja, temple, gaushala, festival)
 *   WIDE  960  full-width strips and gallery tiles
 *   HERO 1280  the one above-the-fold hero on a page
 */
export const IMG_W = {
 THUMB: 250,
 CARD: 500,
 WIDE: 960,
 HERO: 1280,
} as const;

/**
 * Resize ANY remote image URL to `width` CSS pixels using the host's own
 * resizer. Wikimedia Commons → /thumb/<w>px-; Unsplash → w/h/q params;
 * every other host (Supabase, CloudFront, YouTube, an operator-supplied
 * URL) is returned untouched rather than guessed at.
 *
 * This exists because `images.unoptimized` is true in next.config.ts — see
 * the comment there — so Next emits no srcset of its own and nothing else
 * stands between a 6016x4000 original and a 375px phone.
 */
export function remoteImage(url: string, width: number): string {
 if (!url) return url;
 url = relativizeOwnImage(url);
 const local = selfHostedFor(url, width);
 if (local) return local.url;
 if (url.includes('upload.wikimedia.org/wikipedia/commons/')) return wikiThumb(url, width);
 if (url.includes('images.unsplash.com')) {
   const currentW = Number(/[?&]w=(\d+)/.exec(url)?.[1] ?? 0);
   const currentH = Number(/[?&]h=(\d+)/.exec(url)?.[1] ?? 0);
   if (currentW && width >= currentW) return url;
   let out = url.replace(/([?&])w=\d+/, `$1w=${width}`);
   if (currentW && currentH) {
     out = out.replace(/([?&])h=\d+/, `$1h=${Math.round((currentH / currentW) * width)}`);
   }
   return out.replace(/([?&])q=\d+/, `$1q=${qualityFor(width, width)}`);
 }
 return url;
}

/**
 * Build a `srcSet` for a remote URL so a 375px phone downloads the 500px
 * candidate while a desktop takes the 960px one. Returns undefined when the
 * host has no resizer, which is the correct value for the React `srcSet`
 * prop (attribute omitted entirely).
 *
 * Widths that collapse to the same URL after ladder-snapping are dropped —
 * a duplicate candidate is dead weight and confuses the selection algorithm.
 */
export function remoteSrcSet(url: string | undefined, widths: number[]): string | undefined {
 if (!url) return undefined;
 url = relativizeOwnImage(url);
 const resizable =
   url.includes('upload.wikimedia.org/wikipedia/commons/') ||
   url.includes('images.unsplash.com') ||
   selfHostedFor(url, widths[0] ?? 500) !== undefined;
 if (!resizable) return undefined;
 const seen = new Set<string>();
 const parts: string[] = [];
 for (const w of [...widths].sort((a, b) => a - b)) {
   const candidate = remoteImage(url, w);
   if (seen.has(candidate)) continue;
   seen.add(candidate);
   // Descriptor must reflect the width actually served, not the width asked
   // for, or the browser picks the wrong candidate.
   const served =
     selfHostedFor(url, w)?.width ??
     Number(/\/(\d+)px-/.exec(candidate)?.[1] ?? /[?&]w=(\d+)/.exec(candidate)?.[1] ?? w);
   parts.push(`${candidate} ${served}w`);
 }
 return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Resize an Unsplash URL by replacing its w/h/q params.
 */
export function resizeImage(
 url: string,
 preset: 'hero' | 'card' | 'thumb' | 'avatar',
): string {
 const local = selfHostedFor(url, { hero: 1600, card: 800, thumb: 400, avatar: 200 }[preset]);
 if (local) return local.url;
 if (!url.includes('images.unsplash.com')) {
 // Wikimedia: pick a thumb width matching the preset
 const widths = { hero: 1600, card: 800, thumb: 400, avatar: 200 };
 return wikiResize(url, widths[preset]);
 }
 const dims = {
 hero: { w: 1600, h: 900, q: 85 },
 card: { w: 800, h: 600, q: 80 },
 thumb: { w: 400, h: 300, q: 75 },
 avatar: { w: 160, h: 160, q: 70 },
 }[preset];
 return url
 .replace(/([?&])w=\d+/, `$1w=${dims.w}`)
 .replace(/([?&])h=\d+/, `$1h=${dims.h}`)
 .replace(/([?&])q=\d+/, `$1q=${dims.q}`);
}

// ────────────────────────────────────────────────────────────
// IMAGES — The single source of truth for all imagery
// ────────────────────────────────────────────────────────────

// Wikimedia photo URLs are permanent. Each was sourced via the official Commons
// MediaWiki API and verified HTTP 200. To swap one, find a replacement at
// https://commons.wikimedia.org and update the URL + the /credits page.

export const IMAGES = {
 // ── Temples ────────────────────────────────────────────────
 // Each entry uses real photos of the actual shrine from Wikimedia Commons.
 temples: {
 'kashi-vishwanath': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
 ],
 },
 'tirumala-tirupati': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 ],
 },
 'siddhivinayak': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg/1280px-Shree_Siddhivinayak_Temple_Mumbai.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg/1280px-Shree_Siddhivinayak_Temple_Mumbai.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg/1280px-Shree_Siddhivinayak_Temple_Mumbai.jpg'),
 ],
 },
 'somnath': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Somanath_mandir_%28cropped%29.jpg/1280px-Somanath_mandir_%28cropped%29.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Somanath_mandir_%28cropped%29.jpg/1280px-Somanath_mandir_%28cropped%29.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Somanath_mandir_%28cropped%29.jpg/1280px-Somanath_mandir_%28cropped%29.jpg'),
 ],
 },
 'jagannath-puri': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Shri_Jagannath_temple.jpg/1280px-Shri_Jagannath_temple.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Shri_Jagannath_temple.jpg/1280px-Shri_Jagannath_temple.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Shri_Jagannath_temple.jpg/1280px-Shri_Jagannath_temple.jpg'),
 ],
 },
 'golden-temple': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg'),
 ],
 },
 'meenakshi-temple': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
 ],
 },
 'kedarnath': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kedarnath_Temple_in_Rainy_season.jpg/1280px-Kedarnath_Temple_in_Rainy_season.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kedarnath_Temple_in_Rainy_season.jpg/1280px-Kedarnath_Temple_in_Rainy_season.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kedarnath_Temple_in_Rainy_season.jpg/1280px-Kedarnath_Temple_in_Rainy_season.jpg'),
 ],
 },
 'badrinath': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Badrinath_Temple_%2C_Uttarakhand.jpg/1280px-Badrinath_Temple_%2C_Uttarakhand.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Badrinath_Temple_%2C_Uttarakhand.jpg/1280px-Badrinath_Temple_%2C_Uttarakhand.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Badrinath_Temple_%2C_Uttarakhand.jpg/1280px-Badrinath_Temple_%2C_Uttarakhand.jpg'),
 ],
 },
 'akshardham': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/e/e9/Swaminarayan_Akshardham%2C_Delhi.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/e/e9/Swaminarayan_Akshardham%2C_Delhi.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/e/e9/Swaminarayan_Akshardham%2C_Delhi.jpg'),
 ],
 },
 'mahakaleshwar': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Mahakaleshwar_Temple%2C_Ujjain.jpg/1280px-Mahakaleshwar_Temple%2C_Ujjain.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Mahakaleshwar_Temple%2C_Ujjain.jpg/1280px-Mahakaleshwar_Temple%2C_Ujjain.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Mahakaleshwar_Temple%2C_Ujjain.jpg/1280px-Mahakaleshwar_Temple%2C_Ujjain.jpg'),
 ],
 },
 'tirupati': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 ],
 },
 'iskcon-vrindavan': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vrindavan%2C_India_%2821178969102%29.jpg/1280px-Vrindavan%2C_India_%2821178969102%29.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vrindavan%2C_India_%2821178969102%29.jpg/1280px-Vrindavan%2C_India_%2821178969102%29.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vrindavan%2C_India_%2821178969102%29.jpg/1280px-Vrindavan%2C_India_%2821178969102%29.jpg'),
 ],
 },
 'dwarkadhish': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/0/0c/Dwarakadheesh_Temple%2C_2014.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/0/0c/Dwarakadheesh_Temple%2C_2014.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/0/0c/Dwarakadheesh_Temple%2C_2014.jpg'),
 ],
 },
 'meenakshi-amman': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
 gallery: [
 wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
 ],
 },

 // ── 12 Jyotirlingas (each is a unique Shiva shrine) ──────
 // HN-05: the previous file for this shrine is not on Commons at all — the
 // API reports it `missing` and both the original and every thumb answer
 // HTTP 404, so it had been rendering as a permanent blank tile. Replaced
 // with the south gopuram of the Srisailam temple itself (1752x1306, CC BY
 // 4.0, Adityamadhav83), wide enough that the 1280 hero is not an upscale.
 'mallikarjuna': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/1/1f/Night_view_of_Srisailam_Temple_South_Gopuram.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/1/1f/Night_view_of_Srisailam_Temple_South_Gopuram.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/1/1f/Night_view_of_Srisailam_Temple_South_Gopuram.jpg')],
 },
 'omkareshwar': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Omkareswar_Jyotirlinga.jpg/1280px-Omkareswar_Jyotirlinga.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Omkareswar_Jyotirlinga.jpg/1280px-Omkareswar_Jyotirlinga.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Omkareswar_Jyotirlinga.jpg/1280px-Omkareswar_Jyotirlinga.jpg')],
 },
 'bhimashankar': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/d/d7/Bhimashankar.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/d/d7/Bhimashankar.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/d/d7/Bhimashankar.jpg')],
 },
 'trimbakeshwar': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg/1280px-Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg/1280px-Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg/1280px-Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg')],
 },
 'vaidyanath': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg')],
 },
 'nageshwar': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Nageshwar.JPG/1280px-Nageshwar.JPG'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Nageshwar.JPG/1280px-Nageshwar.JPG'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Nageshwar.JPG/1280px-Nageshwar.JPG')],
 },
 'rameshwaram': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ramanathaswamy_temple7.JPG/1280px-Ramanathaswamy_temple7.JPG'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ramanathaswamy_temple7.JPG/1280px-Ramanathaswamy_temple7.JPG'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ramanathaswamy_temple7.JPG/1280px-Ramanathaswamy_temple7.JPG')],
 },
 'grishneshwar': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Grishneshwar_temple_in_Aurangabad_district.jpg/1280px-Grishneshwar_temple_in_Aurangabad_district.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Grishneshwar_temple_in_Aurangabad_district.jpg/1280px-Grishneshwar_temple_in_Aurangabad_district.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Grishneshwar_temple_in_Aurangabad_district.jpg/1280px-Grishneshwar_temple_in_Aurangabad_district.jpg')],
 },

 // ── Aliases for slugs used in temple-details.ts ──
 // The rich detail file uses different slug names; map them to the right photos.
 'baidyanath-dham': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg')],
 },
 'tirupati-balaji': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg')],
 },
 'vaishno-devi': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/0/09/Vaishno_Devi_Bhawan.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/0/09/Vaishno_Devi_Bhawan.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/0/09/Vaishno_Devi_Bhawan.jpg')],
 },

 // ── Char Dham (Yamunotri, Gangotri — Kedarnath/Badrinath above) ──
 'yamunotri': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Yamunotri_temple_and_ashram.jpg/1280px-Yamunotri_temple_and_ashram.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Yamunotri_temple_and_ashram.jpg/1280px-Yamunotri_temple_and_ashram.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Yamunotri_temple_and_ashram.jpg/1280px-Yamunotri_temple_and_ashram.jpg')],
 },
 'gangotri': {
 hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Gangotri_Temple_2.jpg/1280px-Gangotri_Temple_2.jpg'),
 thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Gangotri_Temple_2.jpg/1280px-Gangotri_Temple_2.jpg'),
 gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Gangotri_Temple_2.jpg/1280px-Gangotri_Temple_2.jpg')],
 },
 },

 // ── Deities (real Wikimedia depictions: Ravi Varma paintings, sculptures) ──
 deities: {
 'lord-shiva': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
 'lord-shiva-square': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
 'lord-ganesha': wiki('https://upload.wikimedia.org/wikipedia/commons/6/64/Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg'),
 'lord-ganesha-square': wiki('https://upload.wikimedia.org/wikipedia/commons/6/64/Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg'),
 'lord-krishna': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a9/Krishna_Holds_Up_Mount_Govardhan_%28MET_70694%29_cropped.png'),
 'lord-krishna-square': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a9/Krishna_Holds_Up_Mount_Govardhan_%28MET_70694%29_cropped.png'),
 'goddess-lakshmi': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a6/Raja_Ravi_Varma%2C_Goddess_Lakshmi%2C_1896.jpg'),
 'goddess-lakshmi-square': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a6/Raja_Ravi_Varma%2C_Goddess_Lakshmi%2C_1896.jpg'),
 'lord-hanuman': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
 'lord-hanuman-square': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
 'lord-vishnu': wiki('https://upload.wikimedia.org/wikipedia/commons/e/ef/Vishnu_from_Gita_Govinda.jpg'),
 'lord-vishnu-square': wiki('https://upload.wikimedia.org/wikipedia/commons/e/ef/Vishnu_from_Gita_Govinda.jpg'),
 'goddess-durga': wiki('https://upload.wikimedia.org/wikipedia/commons/6/65/Mahishasura-Mardini_Durga.jpg'),
 'goddess-durga-square': wiki('https://upload.wikimedia.org/wikipedia/commons/6/65/Mahishasura-Mardini_Durga.jpg'),
 'lord-rama': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Lord_Rama_with_arrows.jpg/1280px-Lord_Rama_with_arrows.jpg'),
 'goddess-saraswati': wiki('https://upload.wikimedia.org/wikipedia/commons/1/12/Saraswati.jpg'),
 'lord-surya': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
 },

 // ── Pujas / Rituals ────────────────────────────────────────
 pujas: {
 'rudrabhishek': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/From_Abhisheka_To_Panchamrutha.jpg/1280px-From_Abhisheka_To_Panchamrutha.jpg'),
 'abhishek': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/From_Abhisheka_To_Panchamrutha.jpg/1280px-From_Abhisheka_To_Panchamrutha.jpg'),
 'havan': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Priest_performing_Homa.jpg/1280px-Priest_performing_Homa.jpg'),
 'ganesh-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/6/64/Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg'),
 'satyanarayan-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/e/ef/Vishnu_from_Gita_Govinda.jpg'),
 'navgraha-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
 'maha-mrityunjaya': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
 'lakshmi-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a6/Raja_Ravi_Varma%2C_Goddess_Lakshmi%2C_1896.jpg'),
 'sundarkand-path': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
 'kaal-sarp-dosh': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
 'mangal-dosh': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
 'vivah-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a9/Krishna_Holds_Up_Mount_Govardhan_%28MET_70694%29_cropped.png'),
 'griha-pravesh': wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
 'navaratri-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/6/65/Mahishasura-Mardini_Durga.jpg'),
 'vastu-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
 'pitru-dosh-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Priest_performing_Homa.jpg/1280px-Priest_performing_Homa.jpg'),
 },

 // ── Store / E-commerce Products ────────────────────────────
 // Each product maps to an image that actually shows the product.
 // - Wikimedia Commons for traditional spiritual items where good photos exist
 // - Unsplash for modern manufactured goods
 store: {
 // Puja Essentials
 'brass-puja-thali': wiki('https://upload.wikimedia.org/wikipedia/commons/7/7b/Hindu_pooja_thali.jpg'),
 'brass-diya': wiki('https://upload.wikimedia.org/wikipedia/commons/7/7c/Indian_Arati_diya.jpg'),
 'puja-bell': wiki('https://upload.wikimedia.org/wikipedia/commons/e/e4/GHANTI.jpg'),
 'incense-sticks': u('photo-1541795083-1b160cf4f3d7', 600, 600),
 'camphor-pack': u('photo-1551690935-a9e6f0a7e788', 600, 600),
 'kumkum-set': u('photo-1577563717655-919fc57789b4', 600, 600),

 // Rudraksha & Malas
 'rudraksha-mala': wiki('https://upload.wikimedia.org/wikipedia/commons/9/9c/Rudraksha_mala.jpg'),
 'tulsi-mala': wiki('https://upload.wikimedia.org/wikipedia/commons/2/20/Japa_mala_%28prayer_beads%29_of_Tulasi_wood_with_108_beads_-_20040101-01.jpg'),
 'crystal-mala': u('photo-1601824096525-954268b9eb72', 600, 600),

 // Idols & Murtis (Wikimedia: real photographed/sculpted idols)
 'ganesh-murti': wiki('https://upload.wikimedia.org/wikipedia/commons/c/c8/Marble_Dagadusheth_Halwai_Ganapati_Statue_from_Maliyas.com_Jaipur_India.jpg'),
 'krishna-idol': wiki('https://upload.wikimedia.org/wikipedia/commons/3/38/Brass_standing_figure_of_Krishna_playing_the_flute._Wellcome_M0012566.jpg'),
 'lakshmi-idol': wiki('https://upload.wikimedia.org/wikipedia/commons/9/98/The_Hindu_Goddess_Shri_Lakshmi_LACMA_M.87.210_%281_of_2%29.jpg'),

 // Puja Samagri
 'pooja-samagri-kit': u('photo-1633368516165-f7b04d6428d1', 600, 600),
 'navratri-kit': u('photo-1605292356183-a77d0a9c9d1d', 600, 600),
 'copper-kalash': wiki('https://upload.wikimedia.org/wikipedia/commons/f/f4/Navratri_Kalash_Puja.jpg'),
 'havan-samagri': wiki('https://upload.wikimedia.org/wikipedia/commons/c/c7/%28A%29_puja_fire%2C_Havanam.jpg'),

 // Books & Scriptures
 //
 // CM-08 (2026-09-01): 'sunderkand-book' and 'hanuman-chalisa-book' were the
 // SAME Commons file. Two SKUs at two prices, one picture, and the picture was
 // of the other book — a devotee buying the Sunderkand saw a Hanuman Chalisa.
 // Guarded now by __tests__/cm08-store-image-distinctness.test.ts, which fails
 // if any two store SKUs ever share an image again.
 //
 // The Sunderkand is the fifth kanda of the Ramcharitmanas, so a photograph of
 // a printed Ramcharitmanas is the honest picture for it. Verified against the
 // Commons imageinfo API on 2026-09-01: File:Ramcharitmanas book.jpg,
 // 5456x3632, CC BY-SA 4.0, author Wikilover90, AttributionRequired true —
 // credited in lib/image-credits.ts. Its 500px thumb is 33,340 B against the
 // 102,278 B it replaces, measured the same day.
 'bhagavad-gita': wiki('https://upload.wikimedia.org/wikipedia/commons/3/34/Bhagavad_Gita_book_%28small%29_01.jpg'),
 // KNOWN DEFECT, needs a photograph nobody has taken yet — do not "fix" this
 // by pointing it at another book. Hanuman_Chalisa_4x3.jpg is not a photograph
 // of a printed edition at all: it is a poster graphic of the text, and it
 // carries a third-party design studio's watermark and phone number
 // ("Impressions.Graphics", twice, plus a number) burnt into the top of the
 // frame. So the store's paid product card advertises somebody else's
 // business. Commons was searched on 2026-09-01 (intitle:"Hanuman Chalisa",
 // Category:Hanuman Chalisa, and four keyword queries): every candidate is
 // either the same watermarked poster re-uploaded (File:Hanuman Chalisa.jpg)
 // or a crowd photograph of a recitation, and none is a book. This is the
 // finding's "real photography of actual products" half and it needs the owner
 // to shoot the SKU.
 'hanuman-chalisa-book': wiki('https://upload.wikimedia.org/wikipedia/commons/d/da/Hanuman_Chalisa_4x3.jpg'),
 'sunderkand-book': wiki('https://upload.wikimedia.org/wikipedia/commons/c/ca/Ramcharitmanas_book.jpg'),

 // Spiritual Jewellery
 'rudraksha-bracelet': u('photo-1622993361118-b6365d859ab6', 600, 600),
 'om-pendant': u('photo-1747576129956-d8124fab8668', 600, 600),

 // Organic & Natural
 'cow-ghee': wiki('https://upload.wikimedia.org/wikipedia/commons/6/65/Pure_Ghee-Homemade-Maharashtra.jpg'),
 'sandalwood-paste': u('photo-1595414902678-862fe51c9f27', 600, 600),

 // Home Temple & Decor
 'wooden-mandir': u('photo-1618897033742-4ad61a660b11', 600, 600),
 'led-diya-set': u('photo-1513625047154-f390b1b0df20', 600, 600),
 },

 // ── Gaushala / Cow Seva ────────────────────────────────────
 // Real Wikimedia photos of Indian cows + actual gaushalas. The previous
 // Unsplash photos showed wrong species (pigs, European cattle).
 gaushala: {
 'gir-cow': wiki('https://upload.wikimedia.org/wikipedia/commons/8/84/Gir_cow.jpg'),
 'sahiwal-cow': wiki('https://upload.wikimedia.org/wikipedia/commons/5/52/Sahiwala_01.JPG'),
 'tharparkar-cow': wiki('https://upload.wikimedia.org/wikipedia/commons/d/d5/Tharparkar_01.JPG'),
 'red-sindhi-cow': wiki('https://upload.wikimedia.org/wikipedia/commons/6/60/Red_Sindhi_Cow_at_Pakistan.jpg'),
 'cow-feeding': wiki('https://upload.wikimedia.org/wikipedia/commons/3/36/Surabhi_Cow_Vrindavan.jpg'),
 'cow-shelter': wiki('https://upload.wikimedia.org/wikipedia/commons/3/33/Goshala-ISKCON.jpg'),
 'calf': wiki('https://upload.wikimedia.org/wikipedia/commons/1/13/A_beautiful_gaze.jpg'),
 'cow-field': wiki('https://upload.wikimedia.org/wikipedia/commons/2/28/A_beautiful_photo_of_cows_grazing_in_the_field.jpg'),
 'gaushala-hero': wiki('https://upload.wikimedia.org/wikipedia/commons/3/33/Goshala-ISKCON.jpg'),
 'cow-care': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/ILRI%2C_Stevie_Mann_-_Women_washing_and_cow_drinking_at_a_river_in_Rajasthan%2C_India.jpg'),
 },

 // ── Spiritual Content (aartis, chalisas, mantras, bhajans) ──
 content: {
 'aarti': wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
 'aarti-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
 'chalisa': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
 'chalisa-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
 'mantra': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
 'mantra-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
 'bhajan': wiki('https://upload.wikimedia.org/wikipedia/commons/0/04/Navaratri_Bajan.jpg'),
 'bhajan-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/0/04/Navaratri_Bajan.jpg'),
 'stotram': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
 'stotram-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
 'spiritual-talk': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg/1280px-1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg'),
 'meditation': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg/1280px-1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg'),
 'yoga': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg/1280px-1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg'),
 },

 // ── Hero / Banner Images ───────────────────────────────────
 hero: {
 home: wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
 temples: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
 darshan: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Shri_Jagannath_temple.jpg/1280px-Shri_Jagannath_temple.jpg'),
 astrology: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
 pujas: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/From_Abhisheka_To_Panchamrutha.jpg/1280px-From_Abhisheka_To_Panchamrutha.jpg'),
 store: u('photo-1603228254119-e6a4d095dc59', 1600, 700),
 content: wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
 gaushala: u('photo-1516467508483-a7212febe31a', 1600, 700),
 panchang: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
 'ask-pandit': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Priest_performing_Homa.jpg/1280px-Priest_performing_Homa.jpg'),
 },

 // ── Astrologers / Pandits (stock portraits) ────────────────
 astrologers: {
 male: [
 u('photo-1507003211169-0a1dd7228f2d', 400, 400),
 u('photo-1500648767791-00dcc994a43e', 400, 400),
 u('photo-1472099645785-5658abf4ff4e', 400, 400),
 u('photo-1506794778202-cad84cf45f1d', 400, 400),
 u('photo-1560250097-0b93528c311a', 400, 400),
 u('photo-1522075469751-3a6694fb2f61', 400, 400),
 ],
 female: [
 u('photo-1494790108377-be9c29b29330', 400, 400),
 u('photo-1438761681033-6461ffad8d80', 400, 400),
 u('photo-1534528741775-53994a69daeb', 400, 400),
 u('photo-1544005313-94ddf0286df2', 400, 400),
 u('photo-1488426862026-3ee34a7d66df', 400, 400),
 u('photo-1487412720507-e7ab37603c6f', 400, 400),
 ],
 },

 // ── Priests (stock portraits) ──────────────────────────────
 priests: {
 profiles: [
 u('photo-1507003211169-0a1dd7228f2d', 300, 300),
 u('photo-1500648767791-00dcc994a43e', 300, 300),
 u('photo-1472099645785-5658abf4ff4e', 300, 300),
 u('photo-1506794778202-cad84cf45f1d', 300, 300),
 ],
 },

 // ── Backgrounds & Decorative ───────────────────────────────
 backgrounds: {
 'warm-gradient': u('photo-1507400492013-162706c8c05e', 1920, 1080),
 'temple-interior': wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
 'sunrise': u('photo-1506905925346-21bda4d32df4', 1920, 1080),
 'diya-light': u('photo-1603228254119-e6a4d095dc59', 1920, 1080),
 'rangoli': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/The_Rangoli_of_Lights.jpg/1280px-The_Rangoli_of_Lights.jpg'),
 'flowers-offering': u('photo-1603228254119-e6a4d095dc59', 1920, 1080),
 },

 // ── Festivals (real festival photos from Wikimedia) ────────
 festivals: {
 'diwali': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/The_Rangoli_of_Lights.jpg/1280px-The_Rangoli_of_Lights.jpg'),
 'holi': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Holi_Festival_of_Colors.jpg/1280px-Holi_Festival_of_Colors.jpg'),
 'navratri': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Shardiya_Navratri_Festival_in_Pune_2020.jpg/1280px-Shardiya_Navratri_Festival_in_Pune_2020.jpg'),
 'ganesh-chaturthi': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Khairathabad_Vinayakudu_2021.jpg/1280px-Khairathabad_Vinayakudu_2021.jpg'),
 'maha-shivaratri': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/02_Mahashivratree_festival.JPG/1280px-02_Mahashivratree_festival.JPG'),
 'ram-navami': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Lord_Rama_with_arrows.jpg/1280px-Lord_Rama_with_arrows.jpg'),
 'janmashtami': wiki('https://upload.wikimedia.org/wikipedia/commons/0/07/Yesoda-krishna.jpg'),
 'raksha-bandhan': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Rakhi_1.JPG/1280px-Rakhi_1.JPG'),
 'makar-sankranti': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
 'chhath-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/JanakpurChhathParvaFestival.jpg/1280px-JanakpurChhathParvaFestival.jpg'),
 },

 // ── Misc / Placeholders ────────────────────────────────────
 placeholders: {
 avatar: u('photo-1535713875002-d1d0cf377fde', 200, 200),
 'temple-card': wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
 'puja-card': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/From_Abhisheka_To_Panchamrutha.jpg/1280px-From_Abhisheka_To_Panchamrutha.jpg'),
 'product-card': u('photo-1603228254119-e6a4d095dc59', 400, 400),
 'video-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
 'og-image': wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
 },
} as const;

// ────────────────────────────────────────────────────────────
// Type definitions
// ────────────────────────────────────────────────────────────

export type ImageCategory = keyof typeof IMAGES;

export type TempleSlug = keyof typeof IMAGES.temples;
export type DeityKey = keyof typeof IMAGES.deities;
export type PujaSlug = keyof typeof IMAGES.pujas;
export type StoreProductSlug = keyof typeof IMAGES.store;
export type GaushalaKey = keyof typeof IMAGES.gaushala;
export type ContentKey = keyof typeof IMAGES.content;
export type HeroKey = keyof typeof IMAGES.hero;
export type FestivalKey = keyof typeof IMAGES.festivals;

// ────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────

const FALLBACK_IMAGE = wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg');

export function getImage(
 category: string,
 key: string,
 size?: string
): string {
 const cat = (IMAGES as Record<string, unknown>)[category];
 if (!cat || typeof cat !== 'object') return FALLBACK_IMAGE;

 const record = cat as Record<string, unknown>;
 let url: string | undefined;

 const value = record[key];
 if (typeof value === 'string') {
 url = value;
 } else if (value && typeof value === 'object' && 'hero' in value) {
 url = (value as { hero: string }).hero;
 }

 if (!url) return remoteImage(FALLBACK_IMAGE, IMG_W.CARD);

 // `size` is the legacy "WxH" form; only the width drives the request.
 const width = size ? Number(size.split('x')[0]) || IMG_W.CARD : IMG_W.CARD;
 return remoteImage(url, width);
}

export function getTempleHero(slug: string, width: number = IMG_W.HERO): string {
 const temple = IMAGES.temples[slug as TempleSlug];
 return remoteImage(temple?.hero ?? FALLBACK_IMAGE, width);
}

export function getTempleThumbnail(slug: string, width: number = IMG_W.CARD): string {
 const temple = IMAGES.temples[slug as TempleSlug];
 return remoteImage(temple?.thumbnail ?? FALLBACK_IMAGE, width);
}

export function getTempleGallery(slug: string, width: number = IMG_W.WIDE): readonly string[] {
 const temple = IMAGES.temples[slug as TempleSlug];
 return (temple?.gallery ?? []).map((u) => remoteImage(u, width));
}

export function getDeityImage(
 slug: string,
 variant: 'portrait' | 'square' = 'portrait',
 width?: number,
): string {
 const key = variant === 'square' ? `${slug}-square` : slug;
 const deities = IMAGES.deities as Record<string, string>;
 const url = deities[key] ?? deities[slug] ?? FALLBACK_IMAGE;
 return remoteImage(url, width ?? IMG_W.CARD);
}

export function getPujaImage(slug: string, width: number = IMG_W.CARD): string {
 const url = (IMAGES.pujas as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
 return remoteImage(url, width);
}

/**
 * Store product photo. Defaults to CARD — the store grid paints these into a
 * ~170px (mobile, 2-up) to ~280px (desktop) box. This used to return the raw
 * Commons original: /store measured 29,056 KB of images at a 375px viewport,
 * with a single 5,594 KB Rudraksha_mala.jpg landing in a 170px slot.
 */
export function getProductImage(slug: string, width: number = IMG_W.CARD): string {
 const url = (IMAGES.store as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
 return remoteImage(url, width);
}

/**
 * Gaushala / cow-seva photo. This group had no getter at all — pages read
 * IMAGES.gaushala directly, so /gaushala shipped 16,131 KB of images
 * including a 7,816 KB Sahiwala_01.JPG.
 */
export function getGaushalaImage(key: string, width: number = IMG_W.CARD): string {
 const url = (IMAGES.gaushala as Record<string, string>)[key] ?? FALLBACK_IMAGE;
 return remoteImage(url, width);
}

export function getHeroImage(page: string, width: number = IMG_W.HERO): string {
 const url = (IMAGES.hero as Record<string, string>)[page] ?? FALLBACK_IMAGE;
 return remoteImage(url, width);
}

export function getAstrologerImage(
 gender: 'male' | 'female',
 index: number,
 width: number = IMG_W.THUMB,
): string {
 const pool = IMAGES.astrologers[gender];
 return remoteImage(pool[index % pool.length] ?? FALLBACK_IMAGE, width);
}

export function getFestivalImage(slug: string, width: number = IMG_W.CARD): string {
 const url = (IMAGES.festivals as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
 return remoteImage(url, width);
}

export function getContentImage(
 type: string,
 variant: 'full' | 'thumbnail' = 'full',
 width?: number,
): string {
 const key = variant === 'thumbnail' ? `${type}-thumbnail` : type;
 const content = IMAGES.content as Record<string, string>;
 const url = content[key] ?? content[type] ?? FALLBACK_IMAGE;
 return remoteImage(url, width ?? (variant === 'thumbnail' ? IMG_W.THUMB : IMG_W.WIDE));
}
