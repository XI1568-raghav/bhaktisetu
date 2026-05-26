// Shared helpers for agent fleet. Pure node ESM, no deps.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const REPORT_DIR = 'docs/agent-reports';
export const TODAY = new Date().toISOString().slice(0, 10);

export function isoNow() {
  return new Date().toISOString();
}

export function writeReport(agentName, body, { suffix = '' } = {}) {
  const fname = `${TODAY}-${agentName}${suffix ? `-${suffix}` : ''}.md`;
  const fpath = join(REPORT_DIR, fname);
  mkdirSync(dirname(fpath), { recursive: true });
  writeFileSync(fpath, body, 'utf8');
  console.log(`[${agentName}] wrote ${fpath} (${body.length} bytes)`);
  return fpath;
}

export function upsertLog(name, line) {
  const fpath = join(REPORT_DIR, `_${name}-log.md`);
  mkdirSync(REPORT_DIR, { recursive: true });
  const prev = existsSync(fpath) ? readFileSync(fpath, 'utf8') : `# ${name} log\n\n`;
  const head = prev.split('\n').slice(0, 2).join('\n') + '\n';
  const rest = prev.split('\n').slice(2).join('\n');
  writeFileSync(fpath, `${head}\n- ${isoNow()} — ${line}\n${rest}`, 'utf8');
}

export async function fetchJson(url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, headers: { 'user-agent': 'darshya-agent/1.0', ...(opts.headers || {}) } });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: String(e) };
  }
}

export async function fetchText(url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, headers: { 'user-agent': 'darshya-agent/1.0', ...(opts.headers || {}) } });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: 0, text: String(e) };
  }
}

export const WEB_BASE = process.env.WEB_BASE || 'https://darshya.online';
export const API_BASE = process.env.API_BASE || 'https://api.darshya.online';
