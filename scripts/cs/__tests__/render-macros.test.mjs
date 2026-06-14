import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseMacroYaml,
  validateMacros,
  detectForeignScript,
  renderForWati,
  renderForFreshdesk,
  renderForZohoCsv,
} from '../render-macros.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const YAML_PATH = resolve(__dirname, '../../../docs/agent-reports/cs/macros/multilingual-macros-v1.yaml');
const REQUIRED_LANGS = ['en','hi','ta','te','bn','mr'];

const parsed = parseMacroYaml(readFileSync(YAML_PATH, 'utf8'));

describe('multilingual-macros-v1.yaml', () => {
  it('parses 40 macros', () => {
    expect(parsed.macros.length).toBe(40);
  });

  it('declares all 6 languages', () => {
    expect(parsed.languages).toEqual(REQUIRED_LANGS);
  });

  it('every macro has all 6 language translations and they are non-empty', () => {
    for (const m of parsed.macros) {
      for (const lang of REQUIRED_LANGS) {
        expect(m.translations[lang], `${m.id}.${lang}`).toBeTruthy();
        expect(m.translations[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('validateMacros passes on the shipped YAML', () => {
    expect(() => validateMacros(parsed)).not.toThrow();
  });

  it('every declared variable appears in every translation', () => {
    for (const m of parsed.macros) {
      for (const v of m.variables) {
        const ph = `{${v}}`;
        for (const lang of REQUIRED_LANGS) {
          expect(m.translations[lang].includes(ph), `${m.id}.${lang} missing ${ph}`).toBe(true);
        }
      }
    }
  });

  it('intent IDs are unique and M001..M040 format', () => {
    const ids = parsed.macros.map(m => m.id);
    expect(new Set(ids).size).toBe(40);
    for (const id of ids) expect(id).toMatch(/^M\d{3}$/);
  });
});

describe('renderForWati', () => {
  it('replaces {var} with {{N}} preserving order', () => {
    const { text, varMap } = renderForWati('Hi {user_name}, your order {order_id} for ₹{amount}.', ['user_name','amount','order_id']);
    expect(varMap).toEqual({ user_name: 1, amount: 2, order_id: 3 });
    expect(text).toBe('Hi {{1}}, your order {{3}} for ₹{{2}}.');
  });

  it('leaves text alone when no variables', () => {
    const { text } = renderForWati('Welcome to Bhaktisetu.', []);
    expect(text).toBe('Welcome to Bhaktisetu.');
  });
});

describe('renderForFreshdesk', () => {
  it('produces name + description + 6 actions', () => {
    const m = parsed.macros[0];
    const out = renderForFreshdesk(m);
    expect(out.name).toContain(m.id);
    expect(out.name).toContain(m.intent);
    expect(out.description).toContain(m.category);
    expect(out.actions).toHaveLength(6);
    expect(out.actions.map(a => a.lang)).toEqual(REQUIRED_LANGS);
    expect(out.actions[0].name).toBe('send_reply');
    // Variables get rewritten to Freshdesk dotted notation
    if (m.variables.includes('user_name')) {
      expect(out.actions[0].value).toContain('{{ticket.user_name}}');
    }
  });
});

describe('renderForZohoCsv', () => {
  it('returns one row per language for a macro', () => {
    const rows = renderForZohoCsv(parsed.macros[0]);
    expect(rows).toHaveLength(6);
    expect(rows.map(r => r.language)).toEqual(REQUIRED_LANGS);
    expect(rows[0].macro_id).toBe(parsed.macros[0].id);
  });

  it('escapes embedded double quotes for CSV', () => {
    const fake = { id:'M999', intent:'x', category:'y', variables:[], translations:Object.fromEntries(REQUIRED_LANGS.map(l => [l, 'He said "hi".'])) };
    const rows = renderForZohoCsv(fake);
    expect(rows[0].body).toBe('He said ""hi"".');
  });
});

describe('detectForeignScript (unicode block guards)', () => {
  it('flags Devanagari leaking into Tamil', () => {
    const found = detectForeignScript('வணக்கம் नमस्ते', 'ta');
    expect(found.length).toBeGreaterThan(0);
  });

  it('does not flag pure Tamil + ASCII + ₹', () => {
    expect(detectForeignScript('வணக்கம் {user_name}, ₹100.', 'ta')).toEqual([]);
  });

  it('does not flag Devanagari in Hindi or Marathi', () => {
    expect(detectForeignScript('नमस्ते आप', 'hi')).toEqual([]);
    expect(detectForeignScript('नमस्कार आपण', 'mr')).toEqual([]);
  });

  it('detects Devanagari in Telugu', () => {
    expect(detectForeignScript('మీరు नमस्ते', 'te').length).toBeGreaterThan(0);
  });

  it('detects Devanagari in Bengali', () => {
    expect(detectForeignScript('আপনি नमस्ते', 'bn').length).toBeGreaterThan(0);
  });
});

describe('validateMacros negative cases', () => {
  it('throws when a translation is empty', () => {
    const bad = JSON.parse(JSON.stringify(parsed));
    bad.macros[0].translations.ta = '';
    expect(() => validateMacros(bad)).toThrow(/missing\/empty/);
  });

  it('throws when a variable is missing from a translation', () => {
    const bad = JSON.parse(JSON.stringify(parsed));
    // Strip {user_name} from one lang
    bad.macros[0].translations.ta = bad.macros[0].translations.ta.replace(/\{user_name\}/g, 'X');
    expect(() => validateMacros(bad)).toThrow(/variable \{user_name\} missing/);
  });

  it('throws on bad id format', () => {
    const bad = JSON.parse(JSON.stringify(parsed));
    bad.macros[0].id = 'X1';
    expect(() => validateMacros(bad)).toThrow(/bad id/);
  });
});
