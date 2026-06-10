// scripts/agents/onboarding-v2/_onboard-lib.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const STATE_PATH = 'docs/agent-reports/_onboarding-fleet-v2-state.json';
const REPORT_DIR = 'docs/agent-reports';

export function loadState() {
  if (!existsSync(STATE_PATH)) return { lastRun: null, contacts: {} };
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); }
  catch { return { lastRun: null, contacts: {} }; }
}

export function saveState(state) {
  state.lastRun = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function daysSince(iso) {
  const then = new Date(iso).getTime();
  return Math.floor((Date.now() - then) / 86400000);
}

export function shouldFire(contact, touchKey, dayThreshold) {
  if (contact.touches?.[touchKey]) return false;          // already fired
  if (daysSince(contact.joinedAt) < dayThreshold) return false; // too early
  return true;
}

export function markTouch(state, contactId, touchKey) {
  if (!state.contacts[contactId].touches) state.contacts[contactId].touches = {};
  state.contacts[contactId].touches[touchKey] = new Date().toISOString();
}

export function filterByRole(state, role) {
  return Object.entries(state.contacts)
    .filter(([k, v]) => v.role === role && v.status === 'active')
    .map(([k, v]) => ({ id: k, ...v }));
}

export function writeReport(role, body) {
  mkdirSync(REPORT_DIR, { recursive: true });
  const fname = `${isoToday()}-onboard-${role}.md`;
  writeFileSync(`${REPORT_DIR}/${fname}`, body);
  return fname;
}

export function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`);
}
