#!/usr/bin/env node
/**
 * Self-host the catalogue photography (ledger TD-09 / CM-08).
 *
 * One-off maintenance tool, NOT part of the build: it downloads each source
 * once, re-encodes it to WebP under apps/web/public/images/<dest>, and writes
 *   - apps/web/lib/self-hosted-images.data.ts   (web funnel: source -> local path)
 *   - apps/api/src/lib/self-hosted-images.data.ts (identical copy for the API)
 *   - apps/web/public/images/ATTRIBUTION.md  (author / licence / source page)
 *
 * Source list: scripts/self-host-images.sources.json
 *   { dest, kind: 'commons', file, maxW } | { dest, kind: 'unsplash', id, maxW }
 *
 * Licence gate: a Commons file is only self-hosted when the Commons
 * `extmetadata` reports a free licence (CC0 / CC BY / CC BY-SA / public
 * domain). Anything else is SKIPPED and reported; the site keeps a neutral
 * gradient placeholder for it rather than an uncleared photo.
 *
 * Each hosted Commons derivative carries its credit INSIDE the file (EXIF
 * Artist/Copyright/ImageDescription), built from the register in
 * apps/web/lib/image-credits.ts by commonsAttributionText(), so the licence
 * travels with the bytes (cm08-self-hosted-image-attribution.test.ts reads it
 * back). Hence it runs under tsx, to import that register:
 *
 * Usage:
 *   cd apps/api && IMG_CACHE=/tmp/darshya-img-cache pnpm exec tsx ../../scripts/self-host-images.mjs
 * IMG_CACHE keeps raw downloads so re-encoding never re-hits Wikimedia.
 *
 * Incremental mode: ONLY=<dest>[,<dest>...] processes just those entries of
 * the sources file and MERGES them into the existing generated data files and
 * ATTRIBUTION.md, leaving every other file and row untouched (a full run
 * re-downloads all sources, which Wikimedia rate-limits from shared IPs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const sharp = require('sharp');

const credits = await import(path.join(root, 'apps/web/lib/image-credits.ts'));
const creditRows = new Map(credits.COMMONS_CREDITS.map((c) => [c.file, c]));
const UA = 'DarshyaImageSelfHost/1.0 (https://darshya.online; one-off asset migration)';
const OUT = path.join(root, 'apps/web/public/images');
const CACHE = process.env.IMG_CACHE || path.join(root, '.img-cache');
const TARGET_MAX = 68 * 1024;
const allSources = JSON.parse(fs.readFileSync(path.join(root, 'scripts/self-host-images.sources.json'), 'utf8'));
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',').map((x) => x.trim()).filter(Boolean)) : null;
const sources = ONLY ? allSources.filter((s) => ONLY.has(s.dest)) : allSources;
if (ONLY && sources.length !== ONLY.size) throw new Error('ONLY names a dest that is not in the sources file');

fs.mkdirSync(CACHE, { recursive: true });
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// XMP is UTF-8 (EXIF ASCII turns a non-Latin author name into '?'), so the
// credit survives intact for every author on Commons.
const xmp = (text, who) =>
  `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator><rdf:Seq><rdf:li>${esc(who)}</rdf:li></rdf:Seq></dc:creator><dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${esc(text)}</rdf:li></rdf:Alt></dc:rights><dc:description><rdf:Alt><rdf:li xml:lang="x-default">${esc(text)}</rdf:li></rdf:Alt></dc:description></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FREE = /^(CC0|CC[ -]BY|Public domain|PD|Attribution|Copyrighted free use)/i;
const strip = (s) => (s ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function download(url, cacheName) {
  const f = path.join(CACHE, cacheName);
  if (fs.existsSync(f)) return fs.readFileSync(f);
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) {
      const wait = (Number(r.headers.get('retry-after')) || 5 * (attempt + 1)) * 1000;
      console.log(`  ${r.status} ${cacheName}, waiting ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(f, buf);
    await sleep(1200);
    return buf;
  }
  throw new Error(`gave up ${url}`);
}

async function encode(buf, maxW, exifFor, xmpFor) {
  const meta = await sharp(buf).metadata();
  let width = Math.min(maxW, meta.width ?? maxW);
  let out;
  let q = 72;
  for (let round = 0; round < 6; round++) {
    for (q = 72; q >= 50; q -= 6) {
      out = await sharp(buf).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: q, effort: 6 }).withExif(exifFor(width)).withXmp(xmpFor(width)).toBuffer();
      if (out.length <= TARGET_MAX) break;
    }
    if (out.length <= TARGET_MAX) break;
    width = Math.round(width * 0.85);
  }
  const m = await sharp(out).metadata();
  return { out, width: m.width, height: m.height, quality: q };
}

// ── Commons metadata (batched) ────────────────────────────────────────────
const commons = sources.filter((s) => s.kind === 'commons');
const meta = new Map(); // decoded file name -> {thumburl, extmetadata, descriptionurl, width}
for (let i = 0; i < commons.length; i += 40) {
  const batch = commons.slice(i, i + 40);
  const titles = batch.map((s) => 'File:' + s.file).join('|');
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&redirects=1&prop=imageinfo' +
    '&iiprop=url|size|mime|extmetadata&iiurlwidth=1280&titles=' + encodeURIComponent(titles);
  const j = await getJson(url);
  const norm = new Map();
  for (const n of j.query.normalized ?? []) norm.set(n.to, n.from);
  const redir = new Map();
  for (const n of j.query.redirects ?? []) redir.set(n.to, n.from);
  for (const p of Object.values(j.query.pages)) {
    if (!p.imageinfo) continue;
    let from = p.title;
    if (redir.has(from)) from = redir.get(from);
    if (norm.has(from)) from = norm.get(from);
    meta.set(from.replace(/^File:/, ''), p.imageinfo[0]);
    meta.set(p.title.replace(/^File:/, ''), p.imageinfo[0]);
  }
  await sleep(500);
}

const manifest = { commons: {}, unsplash: {} };
const files = [];
const attribution = [];
const skipped = [];
let total = 0;

for (const s of sources) {
  const dest = path.join(OUT, s.dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    let buf;
    let attr;
    if (s.kind === 'commons') {
      const info = meta.get(s.file) ?? meta.get(s.file.replace(/_/g, ' '));
      if (!info) throw new Error('not found on Commons');
      const em = info.extmetadata ?? {};
      const lic = strip(em.LicenseShortName?.value) || strip(em.UsageTerms?.value);
      if (!FREE.test(lic)) {
        skipped.push({ dest: s.dest, file: s.file, reason: `licence not confirmed free: "${lic || 'none'}"` });
        continue;
      }
      buf = await download(info.thumburl || info.url, 'c-' + s.file.replace(/[^\w.-]/g, '_'));
      attr = {
        dest: s.dest,
        source: info.descriptionurl,
        author: strip(em.Artist?.value) || 'unknown (see source page)',
        licence: lic,
        licenceUrl: strip(em.LicenseUrl?.value),
        origWidth: info.width,
      };
    } else {
      const url = `https://images.unsplash.com/${s.id}?w=1200&q=85&fm=jpg&fit=max`;
      buf = await download(url, 'u-' + s.id);
      attr = {
        dest: s.dest,
        source: `https://images.unsplash.com/${s.id}`,
        author: 'Unsplash contributor (photographer not recoverable from the image URL)',
        licence: 'Unsplash License',
        licenceUrl: 'https://unsplash.com/license',
      };
    }
    const modification = (w) => `resized to ${w}px wide and re-encoded as WebP`;
    let credit;
    if (s.kind === 'commons') {
      const row = creditRows.get(s.file);
      if (!row) throw new Error('no COMMONS_CREDITS row — add one to lib/image-credits.ts first');
      credit = (w) => credits.commonsAttributionText({ origin: 'commons', commonsFile: s.file, modification: modification(w), path: s.dest });
    } else {
      credit = (w) => `Photograph from Unsplash (https://unsplash.com/license), ${modification(w)} by Darshya (https://darshya.online).`;
    }
    const exif = (text, who) => ({ IFD0: { ImageDescription: text, Copyright: text, Artist: who } });
    const who = s.kind === 'commons' ? creditRows.get(s.file).author || 'Unknown author' : 'Unsplash contributor';
    const enc = await encode(buf, s.maxW, (w) => exif(credit(w), who), (w) => xmp(credit(w), who));
    fs.writeFileSync(dest, enc.out);
    total += enc.out.length;
    const rel = '/images/' + s.dest;
    const entry = { path: rel, width: enc.width, height: enc.height };
    // Smaller srcset candidates so phones keep cheap options (the old Commons
    // 250/500px thumbs were 12-50 KB; one big file would be a regression).
    const variants = [];
    for (const vw of [250, 500]) {
      if (enc.width <= vw + 60) continue;
      const v = await sharp(buf).rotate().resize({ width: vw, withoutEnlargement: true }).webp({ quality: vw === 250 ? 62 : 68, effort: 6 }).withExif(exif(credit(vw), who)).withXmp(xmp(credit(vw), who)).toBuffer();
      fs.writeFileSync(dest.replace(/\.webp$/, `-${vw}.webp`), v);
      total += v.length;
      variants.push({ path: rel.replace(/\.webp$/, `-${vw}.webp`), width: vw });
    }
    if (variants.length) entry.variants = variants;
    for (const [p2, w2] of [[rel, enc.width], ...variants.map((v) => [v.path, v.width])]) {
      files.push(
        s.kind === 'commons'
          ? { path: p2, origin: 'commons', commonsFile: s.file, modification: modification(w2) }
          : { path: p2, origin: 'unsplash', modification: modification(w2) },
      );
    }
    if (s.kind === 'commons') manifest.commons[s.file] = entry;
    else manifest.unsplash[s.id] = entry;
    attribution.push({ ...attr, bytes: enc.out.length, width: enc.width, height: enc.height });
    console.log(`${s.dest.padEnd(52)} ${(enc.out.length / 1024).toFixed(0).padStart(4)} KB q${enc.quality} ${enc.width}x${enc.height}`);
  } catch (e) {
    skipped.push({ dest: s.dest, file: s.file ?? s.id, reason: String(e.message ?? e) });
    console.log('SKIP', s.dest, e.message ?? e);
  }
}

// store: product id -> local path (dest recorded in sources via `store` key)
const store = {};
for (const s of sources) {
  for (const id of s.storeIds ?? []) {
    const k = s.kind === 'commons' ? manifest.commons[s.file] : manifest.unsplash[s.id];
    if (k) store[id] = k.path;
  }
}
manifest.store = store;

if (ONLY) {
  const prev = await import(path.join(root, 'apps/web/lib/self-hosted-images.data.ts'));
  const doneFiles = new Set(files.map((f) => f.path));
  manifest.commons = { ...prev.SELF_HOSTED_COMMONS, ...manifest.commons };
  manifest.unsplash = { ...prev.SELF_HOSTED_UNSPLASH, ...manifest.unsplash };
  files.unshift(...prev.SELF_HOSTED_FILES.filter((f) => !doneFiles.has(f.path)));
}

const ts =
  '// GENERATED by scripts/self-host-images.mjs — do not edit by hand.\n' +
  '// Commons file name (decoded) / Unsplash photo id -> self-hosted WebP under public/images.\n' +
  'export interface SelfHostedEntry { path: string; width: number; height: number; variants?: Array<{ path: string; width: number }> }\n' +
  'export const SELF_HOSTED_COMMONS: Readonly<Record<string, SelfHostedEntry>> = ' + JSON.stringify(manifest.commons, null, 2) + ';\n' +
  'export const SELF_HOSTED_UNSPLASH: Readonly<Record<string, SelfHostedEntry>> = ' + JSON.stringify(manifest.unsplash, null, 2) + ';\n' +
  '/** One provenance row per file on disk (main + 500px variants); consumed by SELF_HOSTED_IMAGES in lib/image-credits.ts. */\n' +
  'export const SELF_HOSTED_FILES: ReadonlyArray<{ path: string; origin: \'commons\' | \'unsplash\'; commonsFile?: string; modification: string }> = ' + JSON.stringify(files, null, 2) + ';\n';
fs.writeFileSync(path.join(root, 'apps/web/lib/self-hosted-images.data.ts'), ts);
fs.writeFileSync(path.join(root, 'apps/api/src/lib/self-hosted-images.data.ts'), ts);

attribution.sort((a, b) => a.dest.localeCompare(b.dest));
let md = `# Image attribution\n\nPhotographs under \`/images/temples\`, \`/images/store\`, \`/images/gaushala\` and \`/images/pujas\` are self-hosted copies\n(resized, re-encoded to WebP) of third-party works. Generated by \`scripts/self-host-images.mjs\`; licence\nand author are read from the Wikimedia Commons file page (\`extmetadata\`) at download time.\nCC BY / CC BY-SA files require the credit below; the public-facing credits page is \`/credits\`.\n\n| Local file | Author | Licence | Source |\n|---|---|---|---|\n`;
const rowOf = (a) => `| ${a.dest} | ${a.author.replace(/\|/g, '/')} | ${a.licenceUrl ? `[${a.licence}](${a.licenceUrl})` : a.licence} | ${a.source} |\n`;
let keptTail = '';
if (ONLY) {
  // Merge: keep every existing table row (and the "Not self-hosted" tail) verbatim.
  const prevMd = fs.readFileSync(path.join(OUT, 'ATTRIBUTION.md'), 'utf8');
  const [head, ...rest] = prevMd.split('\n## Not self-hosted');
  keptTail = rest.length ? '\n## Not self-hosted' + rest.join('\n## Not self-hosted') : '';
  const rows = head.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Local file'));
  const fresh = new Set(attribution.map((a) => a.dest));
  const rowDest = (l) => l.split(' | ')[0].slice(2);
  const all = [...rows.filter((l) => !fresh.has(rowDest(l))).map((l) => ({ dest: rowDest(l), line: l + '\n' })), ...attribution.map((a) => ({ dest: a.dest, line: rowOf(a) }))];
  all.sort((a, b) => a.dest.localeCompare(b.dest));
  for (const r of all) md += r.line;
  md += keptTail;
  fs.writeFileSync(path.join(OUT, 'ATTRIBUTION.md'), md);
  console.log(`\nmerged ${attribution.length} file(s), ${(total / 1048576).toFixed(2)} MB written, ${skipped.length} skipped`);
  process.exit(0);
}
for (const a of attribution) {
  md += `| ${a.dest} | ${a.author.replace(/\|/g, '/')} | ${a.licenceUrl ? `[${a.licence}](${a.licenceUrl})` : a.licence} | ${a.source} |\n`;
}
if (skipped.length) {
  md += `\n## Not self-hosted\n\nThese stay on a neutral gradient placeholder (or the remote URL where one is still referenced) until a cleared photo is supplied.\n\n| Target | Source | Reason |\n|---|---|---|\n`;
  for (const k of skipped) md += `| ${k.dest} | ${k.file} | ${k.reason} |\n`;
}
fs.writeFileSync(path.join(OUT, 'ATTRIBUTION.md'), md);
console.log(`\n${attribution.length} files, ${(total / 1048576).toFixed(2)} MB, ${skipped.length} skipped`);
