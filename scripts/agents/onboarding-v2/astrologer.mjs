// scripts/agents/onboarding-v2/astrologer.mjs
import { loadState, saveState, filterByRole, shouldFire, markTouch, writeReport, renderTemplate } from './_onboard-lib.mjs';
import { TEMPLATES } from './templates.mjs';

const ROLE = 'astrologer';
const TOUCHES = [
  { key: 'day0_welcome', day: 0 },
];

const VARS_DEFAULTS = {
  joinUrl: 'https://darshya.online',
};

const state = loadState();
const contacts = filterByRole(state, ROLE);
const drafts = [];

for (const c of contacts) {
  for (const touch of TOUCHES) {
    if (!shouldFire(c, touch.key, touch.day)) continue;
    const template = TEMPLATES[ROLE]?.[touch.key];
    if (!template) continue;
    const vars = { ...VARS_DEFAULTS, name: c.name, city: c.city, phone: c.phone };
    drafts.push({ contact: c, touch: touch.key, message: renderTemplate(template, vars) });
    markTouch(state, c.id, touch.key);
  }
}

if (drafts.length === 0) {
  console.log(`[onboard:${ROLE}] no contacts ready for drip`);
  process.exit(0);
}

const body = `# Astrologer onboarding drip — ${new Date().toISOString().slice(0, 10)}

${drafts.length} drafted message(s). Founder reviews + sends via WhatsApp manually.

${drafts.map(d => `## ${d.contact.name} (${d.contact.id}) — ${d.touch}
Phone: ${d.contact.phone}
City: ${d.contact.city}
\`\`\`
${d.message}
\`\`\`
`).join('\n---\n\n')}
`;

const fname = writeReport(ROLE, body);
saveState(state);
console.log(`[onboard:${ROLE}] wrote ${fname}, drafted ${drafts.length} messages`);
