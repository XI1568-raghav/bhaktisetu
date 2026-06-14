#!/usr/bin/env node
// Reads multilingual-macros-v1.yaml and writes:
//   docs/agent-reports/cs/macros/rendered/whatsapp/{lang}/{intent}.txt
//   docs/agent-reports/cs/macros/rendered/freshdesk/macros.json
//   docs/agent-reports/cs/macros/rendered/zoho/macros.csv
//   docs/agent-reports/cs/macros/rendered/manifest.json

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const YAML_PATH = resolve(ROOT, 'docs/agent-reports/cs/macros/multilingual-macros-v1.yaml');
const OUT = resolve(ROOT, 'docs/agent-reports/cs/macros/rendered');

// ---------- pure parsers/helpers (exported for tests) ----------

/**
 * Minimal YAML parser scoped to the v1 macro schema. Does NOT implement full YAML.
 * Handles: top-level scalars, list of objects with id/intent/category/variables/translations.
 */
export function parseMacroYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = { version: null, generated_at: null, languages: [], macros: [] };
  let cur = null;
  let inTranslations = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trimStart().startsWith('#')) continue;
    if (/^version:\s*/.test(line)) { out.version = Number(line.split(':')[1].trim()); continue; }
    if (/^generated_at:/.test(line)) { out.generated_at = line.replace(/^generated_at:\s*/,'').replace(/^"|"$/g,''); continue; }
    if (/^languages:/.test(line)) {
      const m = line.match(/\[([^\]]+)\]/);
      if (m) out.languages = m[1].split(',').map(s => s.trim());
      continue;
    }
    if (line === 'macros:') continue;

    // top-level item start: "  - id: M001"
    const itemStart = line.match(/^  - id:\s*(\S+)/);
    if (itemStart) {
      if (cur) out.macros.push(cur);
      cur = { id: itemStart[1], intent: null, category: null, variables: [], translations: {} };
      inTranslations = false;
      continue;
    }
    if (!cur) continue;

    const fld = line.match(/^    (\w+):\s*(.*)$/);
    if (fld) {
      const [, key, val] = fld;
      if (key === 'intent') { cur.intent = val.trim(); inTranslations = false; continue; }
      if (key === 'category') { cur.category = val.trim(); inTranslations = false; continue; }
      if (key === 'variables') {
        const m = val.match(/\[([^\]]*)\]/);
        cur.variables = m && m[1].trim() ? m[1].split(',').map(s => s.trim()) : [];
        inTranslations = false;
        continue;
      }
      if (key === 'translations') { inTranslations = true; continue; }
    }
    if (inTranslations) {
      const t = line.match(/^      (\w+):\s*"((?:[^"\\]|\\.)*)"\s*$/);
      if (t) {
        const [, lang, str] = t;
        cur.translations[lang] = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
    }
  }
  if (cur) out.macros.push(cur);
  return out;
}

const REQUIRED_LANGS = ['en','hi','ta','te','bn','mr'];

/**
 * Validates the parsed YAML structure. Throws on schema violation.
 */
export function validateMacros(parsed) {
  if (parsed.version !== 1) throw new Error(`bad version: ${parsed.version}`);
  if (!Array.isArray(parsed.macros) || parsed.macros.length === 0) throw new Error('no macros');
  for (const m of parsed.macros) {
    if (!/^M\d{3}$/.test(m.id)) throw new Error(`bad id: ${m.id}`);
    if (!m.intent) throw new Error(`missing intent on ${m.id}`);
    if (!m.category) throw new Error(`missing category on ${m.id}`);
    for (const lang of REQUIRED_LANGS) {
      const t = m.translations[lang];
      if (typeof t !== 'string' || t.trim() === '') {
        throw new Error(`missing/empty translation: ${m.id}.${lang}`);
      }
    }
    // Variable placeholder consistency: every var declared must appear in every translation.
    for (const v of m.variables) {
      const ph = `{${v}}`;
      for (const lang of REQUIRED_LANGS) {
        if (!m.translations[lang].includes(ph)) {
          throw new Error(`variable {${v}} missing in ${m.id}.${lang}`);
        }
      }
    }
  }
  return true;
}

// Unicode block guards: catch Devanagari leaking into Tamil etc.
const UNICODE_BLOCKS = {
  ta: { name: 'Tamil', range: [0x0B80, 0x0BFF] },
  te: { name: 'Telugu', range: [0x0C00, 0x0C7F] },
  bn: { name: 'Bengali', range: [0x0980, 0x09FF] },
  mr: { name: 'Devanagari (Marathi)', range: [0x0900, 0x097F] },
  hi: { name: 'Devanagari (Hindi)', range: [0x0900, 0x097F] },
};

/**
 * Returns array of foreign-script characters in `text` that don't belong to `lang`'s expected block.
 * Latin (ASCII), digits, punctuation, currency symbols, common Indic punctuation pass.
 */
export function detectForeignScript(text, lang) {
  const expected = UNICODE_BLOCKS[lang];
  if (!expected) return []; // en + langs without block check
  const foreign = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x0080) continue; // ASCII
    if (cp >= 0x2000 && cp <= 0x206F) continue; // general punctuation
    if (cp >= 0x20A0 && cp <= 0x20CF) continue; // currency
    if (cp >= 0xFE70 && cp <= 0xFEFF) continue;
    // Allow chars from any of: target script, or shared Devanagari numerals only when the lang is Hindi/Marathi
    const inTarget = cp >= expected.range[0] && cp <= expected.range[1];
    if (inTarget) continue;
    // For ta/te/bn: REJECT Devanagari leak (spec line 122). For hi/mr: Devanagari is target.
    if (lang === 'ta' || lang === 'te' || lang === 'bn') {
      if (cp >= 0x0900 && cp <= 0x097F) { foreign.push(ch); continue; }
    }
  }
  return foreign;
}

/**
 * Wati WhatsApp template format: {var} → {{N}} ordered.
 * Returns rendered text (placeholders replaced) and the variable→index map.
 */
export function renderForWati(template, variables) {
  let out = template;
  const map = {};
  variables.forEach((v, i) => {
    const idx = i + 1;
    map[v] = idx;
    out = out.split(`{${v}}`).join(`{{${idx}}}`);
  });
  return { text: out, varMap: map };
}

/**
 * Freshdesk bulk-import: each macro becomes one entry with name + description + actions[].
 */
export function renderForFreshdesk(macro) {
  return {
    name: `[${macro.id}] ${macro.intent}`,
    description: `Category: ${macro.category}. Variables: ${macro.variables.join(', ') || 'none'}.`,
    visibility: 1, // 1 = all agents
    actions: REQUIRED_LANGS.map(lang => ({
      name: 'send_reply',
      lang,
      value: macro.translations[lang].replace(/\{(\w+)\}/g, (_, v) => `{{ticket.${v}}}`),
    })),
  };
}

/**
 * Zoho CSV row builder. Returns one row per (macro, lang).
 */
export function renderForZohoCsv(macro) {
  return REQUIRED_LANGS.map(lang => ({
    macro_id: macro.id,
    intent: macro.intent,
    category: macro.category,
    language: lang,
    body: macro.translations[lang].replace(/"/g, '""'),
  }));
}

// ---------- driver ----------

async function main() {
  if (!existsSync(YAML_PATH)) {
    console.error(`YAML not found: ${YAML_PATH}`);
    process.exit(1);
  }
  const text = await readFile(YAML_PATH, 'utf8');
  const parsed = parseMacroYaml(text);
  validateMacros(parsed);

  // Wipe + recreate output dir
  if (existsSync(OUT)) {
    await rm(OUT, { recursive: true, force: true });
  }
  await mkdir(OUT, { recursive: true });

  const manifest = {
    generated_at: new Date().toISOString(),
    source: 'docs/agent-reports/cs/macros/multilingual-macros-v1.yaml',
    intents: parsed.macros.length,
    languages: REQUIRED_LANGS,
    total_files: 0,
    files: [],
    warnings: [],
  };

  // WhatsApp per-lang per-intent .txt
  for (const lang of REQUIRED_LANGS) {
    await mkdir(resolve(OUT, 'whatsapp', lang), { recursive: true });
    for (const m of parsed.macros) {
      const { text: wati } = renderForWati(m.translations[lang], m.variables);
      const foreign = detectForeignScript(m.translations[lang], lang);
      if (foreign.length > 0) {
        manifest.warnings.push({ macro: m.id, lang, foreign_chars: [...new Set(foreign)].join('') });
      }
      const path = resolve(OUT, 'whatsapp', lang, `${m.intent}.txt`);
      const header = `# ${m.id} — ${m.intent} — ${lang}\n# Variables (Wati order): ${m.variables.map((v,i)=>`{{${i+1}}}=${v}`).join(' ') || 'none'}\n\n`;
      await writeFile(path, header + wati + '\n', 'utf8');
      manifest.files.push(`whatsapp/${lang}/${m.intent}.txt`);
    }
  }

  // Freshdesk JSON
  const freshdeskPath = resolve(OUT, 'freshdesk');
  await mkdir(freshdeskPath, { recursive: true });
  const freshdeskJson = parsed.macros.map(renderForFreshdesk);
  await writeFile(
    resolve(freshdeskPath, 'macros.json'),
    JSON.stringify(freshdeskJson, null, 2) + '\n',
    'utf8'
  );
  manifest.files.push('freshdesk/macros.json');

  // Zoho CSV
  const zohoPath = resolve(OUT, 'zoho');
  await mkdir(zohoPath, { recursive: true });
  const header = 'macro_id,intent,category,language,body\n';
  const rows = parsed.macros.flatMap(renderForZohoCsv)
    .map(r => `${r.macro_id},${r.intent},${r.category},${r.language},"${r.body}"`)
    .join('\n');
  await writeFile(resolve(zohoPath, 'macros.csv'), header + rows + '\n', 'utf8');
  manifest.files.push('zoho/macros.csv');

  manifest.total_files = manifest.files.length;
  await writeFile(resolve(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`Rendered ${manifest.total_files} files (${parsed.macros.length} intents × 6 langs WA + 1 Freshdesk + 1 Zoho).`);
  if (manifest.warnings.length) {
    console.warn(`${manifest.warnings.length} unicode-block warnings — see manifest.json#warnings.`);
  }
}

// run only when invoked directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('render-macros.mjs')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
