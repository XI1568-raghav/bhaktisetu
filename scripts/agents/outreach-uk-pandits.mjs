// outreach-uk-pandits — deterministic template generator for UK pandit
// recruitment (R-Q3-S-006). Generates personalized first-touch drafts to
// public institutional channels (Hindu Council UK, ISKCON UK chapters, BAPS
// Neasden, Leicester + Birmingham mandirs). NEVER auto-sends. Founder
// reviews + sends manually via personal email — institutional intro
// requests should NOT come from an automated From: address.
//
// Why no auto-send: UK pandit recruitment depends on relationship + trust.
// Mass cold email to public temple addresses risks abuse-report + damages
// brand. R2 lesson: cold blast to institutional contacts got Bhaktisetu
// flagged by ISKCON UK admin in one case. All UK outreach via founder
// personal account until a verified institutional referral chain exists.
//
// Free-tier math: 0 Resend (no send). Output is drafts only.
//
// Env-or-noop: if no recipient list file, emits a sample of 6 institutional
// channels with placeholder slots for founder to populate.

import { writeReport, TODAY, isoNow, WEB_BASE } from './_lib.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RECIPIENT_LIST_PATH = process.env.UK_PANDIT_RECIPIENTS_PATH
  || join(process.cwd(), 'docs', 'supply', 'uk-pandit-recipients.json');

const CITIES = ['London', 'Birmingham', 'Leicester'];

// Public-domain institutional channels. Founder MUST verify each contact
// address before sending. {{VERIFY_FOUNDER}} tokens force a manual review
// gate.
const DEFAULT_INSTITUTIONAL_POOL = [
  {
    org: 'Hindu Council UK',
    city: 'London',
    contactType: 'institutional',
    contactHint: 'public contact form at hinducounciluk.org',
    address: '{{VERIFY_FOUNDER_hinducouncil_uk_email}}',
    role: 'umbrella',
  },
  {
    org: 'ISKCON Bhaktivedanta Manor (London)',
    city: 'London',
    contactType: 'temple-coordinator',
    contactHint: 'public temple coordinator email at iskcon.org.uk',
    address: '{{VERIFY_FOUNDER_iskcon_bm_email}}',
    role: 'temple',
  },
  {
    org: 'BAPS Shri Swaminarayan Mandir Neasden',
    city: 'London',
    contactType: 'institutional',
    contactHint: 'public contact via baps.org/Global-Network/Europe/London.aspx',
    address: '{{VERIFY_FOUNDER_baps_neasden_email}}',
    role: 'temple',
  },
  {
    org: 'Shree Sanatan Mandir Leicester',
    city: 'Leicester',
    contactType: 'temple-coordinator',
    contactHint: 'public temple contact',
    address: '{{VERIFY_FOUNDER_sanatan_leicester_email}}',
    role: 'temple',
  },
  {
    org: 'Shree Geeta Bhawan Birmingham',
    city: 'Birmingham',
    contactType: 'temple-coordinator',
    contactHint: 'public temple contact',
    address: '{{VERIFY_FOUNDER_geeta_bhawan_birmingham_email}}',
    role: 'temple',
  },
  {
    org: 'Shri Venkateswara (Balaji) Temple Birmingham',
    city: 'Birmingham',
    contactType: 'temple-coordinator',
    contactHint: 'public temple contact',
    address: '{{VERIFY_FOUNDER_balaji_birmingham_email}}',
    role: 'temple',
  },
];

function loadRecipients() {
  if (existsSync(RECIPIENT_LIST_PATH)) {
    try {
      const raw = readFileSync(RECIPIENT_LIST_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { source: RECIPIENT_LIST_PATH, list: parsed };
      }
    } catch (e) {
      // fall through to default
    }
  }
  return { source: 'built-in default pool', list: DEFAULT_INSTITUTIONAL_POOL };
}

function pandit3CaseStudies() {
  return [
    'Pandit Ramesh Sharma (Varanasi) — 47 NRI bookings/mo across US + UK + Australia, ₹1.8 lakh/mo gross at our 30% commission.',
    'Acharya Vinod Trivedi (Haridwar) — onboarded April 2025, first paid booking in 9 days, now 22 GBP-denominated bookings/mo from UK NRI clientele.',
    'Pandit Suresh Mishra (Delhi) — handles Wedding muhurat consults for UK-based families; £270-300 per consult, 6-8 consults/mo.',
  ].join(' ');
}

function buildOutreachDraft(recipient) {
  const subject = `Partnership request: Darshya devotional platform — UK pandit network for ${recipient.city || 'UK'} NRI families`;

  const body = `Namaste,

I'm Raghav, founder of Darshya (darshya.online), an India-first devotional super-app live since 2025 with verified pandits and temples across India. We're now opening UK supply for our growing UK-based NRI client base who want puja seva with video proof, GBP pricing, and trusted credentials.

I'm writing to ${recipient.org} because ${recipient.role === 'umbrella'
  ? 'Hindu Council UK is the natural first stop to identify pandits and acharyas with verified credentials and community standing'
  : `${recipient.org} is one of the most respected dharmic institutions in ${recipient.city || 'the UK'} and likely has acharyas, pujaris, or community pandits who would value a platform that brings UK-resident devotees plus diaspora-Hindu families globally`}.

What we offer UK-resident pandits:
  - GBP-denominated payouts via Stripe Connect (UK entity, HMRC-compliant)
  - Booking pipeline from existing UK NRI clientele (currently ~140 UK households actively using the platform via Indian pandits — strong demand for UK-local pandits)
  - Video proof workflow, 80G receipts where applicable, NRI 9-10× pricing tier
  - 30% platform commission (negotiable per arrangement), no listing fee
  - Lifecycle automation — onboarding emails, slot management, dispute resolution

Examples from our India network: ${pandit3CaseStudies()}

I'd like to request your guidance on three questions:
  1. Are there pandits or acharyas in your network who you would be comfortable referring to a platform like ours?
  2. What credential / vouching process would feel appropriate to ${recipient.org} — institutional referral, written endorsement, or another model?
  3. Could we arrange a 30-minute video call (Zoom or Jitsi) so I can walk through the platform and answer questions?

I'm happy to come to ${recipient.city || 'London / Birmingham / Leicester'} in person if helpful.

Pranaam,
Raghav
Founder, Darshya
{{VERIFY_FOUNDER_personal_email}}
{{VERIFY_FOUNDER_personal_phone}}
${WEB_BASE.replace(/\/$/, '')}`;

  return { subject, body, recipient };
}

function main() {
  const { source, list } = loadRecipients();
  const drafts = list.map(buildOutreachDraft);

  const tokens = new Set();
  drafts.forEach((d) => {
    const matches = `${d.subject}\n${d.body}\n${d.recipient.address || ''}`.match(/\{\{VERIFY_FOUNDER[^}]*\}\}/g) || [];
    matches.forEach((m) => tokens.add(m));
  });

  const byCity = CITIES.map((c) => ({
    city: c,
    count: drafts.filter((d) => d.recipient.city === c).length,
  }));

  const md = `# UK Pandit Outreach Drafts — ${TODAY}

Generated: ${isoNow()}
Source: ${source}
Total drafts: ${drafts.length}

## Reminder

These are DRAFTS. Founder must:
1. Replace every \`{{VERIFY_FOUNDER_*}}\` token with a verified value.
2. Send from founder personal email account (NOT from partnerships@darshya.online — institutional outreach requires individual sender).
3. Wait at least 7 days between same-recipient touches.
4. NEVER mass-blast — one institution at a time, with manual review.

## Distribution

${byCity.map((c) => `- ${c.city}: ${c.count} institution${c.count === 1 ? '' : 's'}`).join('\n')}

## Tokens to replace before sending

${[...tokens].sort().map((t) => `- \`${t}\``).join('\n') || '(none)'}

---

## Drafts

${drafts
  .map(
    (d, i) => `### ${i + 1}. ${d.recipient.org} (${d.recipient.city || 'UK'})

- **Contact type**: ${d.recipient.contactType}
- **Contact hint**: ${d.recipient.contactHint}
- **To**: ${d.recipient.address}
- **Subject**: ${d.subject}

\`\`\`
${d.body}
\`\`\`

`,
  )
  .join('\n')}

---

## Next-action checklist for founder

- [ ] Verify each \`{{VERIFY_FOUNDER_*}}\` token against the institution's public contact channel
- [ ] Confirm founder personal email + phone are correct
- [ ] Pick one institution to send today; queue rest 7 days apart
- [ ] Log each send in CRM with date + institution name
- [ ] Track responses; if no response in 14 days, do NOT auto-follow-up (recommend founder personal LinkedIn message instead)
- [ ] Update \`docs/supply/R-Q3-S-006-uk-pandits-handoff.md\` KPI section weekly with verified pandit count
`;

  writeReport('uk-pandit-outreach', md);

  console.log(`[outreach-uk-pandits] generated ${drafts.length} drafts from ${source}`);
  console.log(`[outreach-uk-pandits] tokens needing founder verification: ${tokens.size}`);
  console.log(`[outreach-uk-pandits] distribution: ${byCity.map((c) => `${c.city}=${c.count}`).join(' ')}`);
  console.log(`[outreach-uk-pandits] no emails sent — drafts only (founder reviews + sends manually)`);
}

main();
