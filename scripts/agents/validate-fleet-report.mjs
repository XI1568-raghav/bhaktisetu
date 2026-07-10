#!/usr/bin/env node
// Validates a fleet agent JSON report against fleet-report.schema.json.
// Used by the agents-daily workflow (before the "Commit reports" step) so
// malformed structured reports never land in the repo. Also runnable locally:
//   node scripts/agents/validate-fleet-report.mjs docs/agent-reports/<file>.json
//
// Exit 0 = valid, 1 = invalid (prints the violations).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '..', '..', 'docs', 'agent-reports', 'fleet-report.schema.json');

// Minimal draft-07 validator — we only use the keywords our schema needs:
// type, const, enum, required, additionalProperties, properties, items,
// pattern, minLength, maxLength, minimum, maximum. No external deps (free-tier).
function validate(value, schema, path = '$') {
  const errs = [];
  if (schema.const !== undefined && value !== schema.const) {
    errs.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errs.push(`${path}: ${JSON.stringify(value)} not in enum [${schema.enum.join(', ')}]`);
  }
  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errs.push(`${path}: ${JSON.stringify(value)} does not match pattern ${schema.pattern}`);
  }
  // Type check — handle 'array' specially (typeof [] === 'object' in JS).
  if (schema.type) {
    let typeOk;
    if (schema.type === 'array') typeOk = Array.isArray(value);
    else typeOk = typeof value === schema.type;
    if (!typeOk) {
      errs.push(`${path}: expected type ${schema.type}, got ${Array.isArray(value) ? 'array' : typeof value}`);
      return errs; // no point validating children if the type is wrong
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      errs.push(`${path}: length ${value.length} < minLength ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      errs.push(`${path}: length ${value.length} > maxLength ${schema.maxLength}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum)
      errs.push(`${path}: ${value} < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum)
      errs.push(`${path}: ${value} > maximum ${schema.maximum}`);
  }
  // Only treat as object if it's a plain object (not an array).
  if (schema.type === 'object' && schema.properties && !Array.isArray(value)) {
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const k of Object.keys(value)) {
        if (!allowed.has(k)) errs.push(`${path}: unexpected property "${k}"`);
      }
    }
    if (schema.required) {
      for (const k of schema.required) {
        if (!(k in value)) errs.push(`${path}: missing required property "${k}"`);
      }
    }
    for (const [k, childSchema] of Object.entries(schema.properties)) {
      if (k in value) errs.push(...validate(value[k], childSchema, `${path}.${k}`));
    }
  }
  if (schema.type === 'array' && schema.items) {
    for (let i = 0; i < value.length; i++) {
      errs.push(...validate(value[i], schema.items, `${path}[${i}]`));
    }
  }
  return errs;
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/agents/validate-fleet-report.mjs <report.json>');
  process.exit(2);
}

let report, schema;
try {
  report = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ Could not read/parse ${file}: ${e.message}`);
  process.exit(1);
}
try {
  schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
} catch (e) {
  console.error(`✗ Could not load schema: ${e.message}`);
  process.exit(1);
}

const errs = validate(report, schema);
if (errs.length === 0) {
  console.log(`✓ ${file} valid (agent=${report.agent}, ${report.findings?.length || 0} findings)`);
  process.exit(0);
}
console.error(`✗ ${file} INVALID — ${errs.length} violation(s):`);
for (const e of errs) console.error(`  ${e}`);
process.exit(1);
