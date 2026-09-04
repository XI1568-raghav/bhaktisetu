import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  humanizeEnum,
  bookingStatusLabel,
  payoutStatusLabel,
  paymentStatusLabel,
  commissionStatusLabel,
  approvalStatusLabel,
  transactionStatusLabel,
  userRoleLabel,
  subscriptionPlanLabel,
  transactionTypeLabel,
  pujaCategoryLabel,
  contentTypeLabel,
  streamStatusLabel,
  wellnessSessionTypeLabel,
  wellnessSessionStatusLabel,
  consultationTypeLabel,
  consultationStatusLabel,
  storeOrderStatusLabel,
  supportTicketStatusLabel,
  supportTicketCategoryLabel,
  applicationStatusLabel,
} from '../enum-labels';

/**
 * CM-10 — a stored value must never reach a devotee's screen as a database
 * identifier.
 *
 * The finding measured the web storefront ("special_occasion" printed in a card
 * metadata row) and the web half was closed by apps/web/lib/puja-labels.ts and
 * apps/web/lib/enum-labels.ts. The SAME defect is all over the Expo app, which
 * nobody had measured: a devotee's own booking list printed `pending_payment`
 * and `priest_assigned`, an astrologer's earnings printed `PENDING`, an admin
 * saw `WELLNESS_INSTRUCTOR` and `bhakti_pass_monthly`, and a wellness student
 * saw `YOGA`. Measured before this file existed: 36 unguarded render sites
 * across 26 screens (the sweep below, run against the tree at HEAD).
 *
 * Two halves:
 *   1. the label functions themselves, pinned against the Prisma enums so a
 *      renamed member is a failing test rather than a shouty word on a phone;
 *   2. a source sweep that fails when ANY screen renders one of these fields
 *      without going through a label function. Without the sweep the module is
 *      just a place the next screen forgets to call.
 */

// ─── 1. the labels ──────────────────────────────────────────────────────────

describe('humanizeEnum — the floor under everything else', () => {
  it('title-cases snake_case', () => {
    expect(humanizeEnum('special_occasion')).toBe('Special Occasion');
  });

  it('title-cases SCREAMING_SNAKE', () => {
    expect(humanizeEnum('WELLNESS_INSTRUCTOR')).toBe('Wellness Instructor');
  });

  it('title-cases kebab-case', () => {
    expect(humanizeEnum('puja-bookings')).toBe('Puja Bookings');
  });

  it('leaves an already-human string alone', () => {
    // devotee/wellness.tsx mixes API enum values and hand-written display
    // strings into one `category` field, so the label function has to be an
    // identity for the latter.
    expect(humanizeEnum('Daily Routine')).toBe('Daily Routine');
    expect(humanizeEnum('Focus')).toBe('Focus');
  });

  it('never returns a separator, whatever it is handed', () => {
    for (const v of ['a_b', 'a-b', 'A__B', 'video_reel', 'nri_premium_yearly']) {
      expect(humanizeEnum(v)).not.toMatch(/[_-]/);
    }
  });

  it('returns empty string for absent values so a caller can drop the element', () => {
    expect(humanizeEnum(null)).toBe('');
    expect(humanizeEnum(undefined)).toBe('');
    expect(humanizeEnum('   ')).toBe('');
  });
});

/**
 * Every member of every enum this module claims to cover, copied from
 * apps/api/prisma/schema.prisma. A member added there and not here still
 * renders through `humanizeEnum`, which is why the last case in each block
 * asserts the FLOOR rather than a specific word.
 */
const ENUM_MEMBERS: Record<string, [(v: string) => string, string[]]> = {
  BookingStatus: [
    bookingStatusLabel,
    [
      'pending_payment',
      'confirmed',
      'priest_assigned',
      'in_progress',
      'completed',
      'video_uploaded',
      'delivered',
      'cancelled',
      'refunded',
    ],
  ],
  PayoutStatus: [payoutStatusLabel, ['pending', 'processing', 'completed', 'failed', 'rejected', 'reversed']],
  PaymentStatus: [
    paymentStatusLabel,
    ['initiated', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
  ],
  CommissionStatus: [commissionStatusLabel, ['PENDING', 'PAID', 'REVERSED']],
  UserRole: [
    userRoleLabel,
    [
      'DEVOTEE',
      'PANDIT',
      'STORE_OWNER',
      'ASTROLOGER',
      'WELLNESS_INSTRUCTOR',
      'GAUSHALA_MANAGER',
      'TEMPLE_MANAGER',
      'ADMIN',
    ],
  ],
  SubscriptionPlan: [
    subscriptionPlanLabel,
    [
      'bhakti_pass_monthly',
      'bhakti_pass_yearly',
      'nri_premium_monthly',
      'nri_premium_yearly',
      'FREE',
      'BASIC',
      'PRO',
      'ENTERPRISE',
    ],
  ],
  ApprovalStatus: [
    approvalStatusLabel,
    ['pending', 'pending_review', 'approved', 'verified', 'rejected', 'active', 'inactive', 'suspended'],
  ],
  TransactionStatus: [transactionStatusLabel, ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']],
  TransactionType: [transactionTypeLabel, ['BOOKING', 'SUBSCRIPTION', 'PAYOUT']],
  PujaCategory: [
    pujaCategoryLabel,
    ['daily', 'special_occasion', 'planetary', 'prosperity', 'health', 'memorial', 'festival'],
  ],
  ContentType: [
    contentTypeLabel,
    ['aarti', 'chalisa', 'mantra', 'bhajan', 'story', 'article', 'shloka', 'video_reel'],
  ],
  StreamStatus: [streamStatusLabel, ['offline', 'live', 'scheduled']],
  WellnessSessionType: [
    wellnessSessionTypeLabel,
    ['YOGA', 'MEDITATION', 'VIPASSANA', 'PRANAYAMA', 'OTHER'],
  ],
  WellnessSessionStatus: [
    wellnessSessionStatusLabel,
    ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'],
  ],
  ConsultationType: [consultationTypeLabel, ['chat', 'call', 'video']],
  ConsultationStatus: [
    consultationStatusLabel,
    ['pending_payment', 'scheduled', 'in_progress', 'completed', 'cancelled', 'refunded'],
  ],
  StoreOrderStatus: [
    storeOrderStatusLabel,
    ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
  ],
  SupportTicketStatus: [supportTicketStatusLabel, ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']],
  SupportTicketCategory: [
    supportTicketCategoryLabel,
    ['BOOKING', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'OTHER'],
  ],
  ApplicationStatus: [
    applicationStatusLabel,
    ['pending', 'accepted', 'rejected', 'withdrawn', 'waitlisted'],
  ],
};

describe.each(Object.entries(ENUM_MEMBERS))('%s', (name, [label, members]) => {
  it.each(members)('%s renders as human copy', (member) => {
    const out = label(member);
    expect(out, `${name}.${member} produced an empty label`).not.toBe('');
    expect(out, `${name}.${member} leaked a separator`).not.toMatch(/[_-]/);
    // SCREAMING_SNAKE members must not simply be shouted back.
    expect(out, `${name}.${member} was passed through unchanged`).not.toBe(member.toUpperCase());
  });

  it('falls back to humanizeEnum for a member nobody has mapped', () => {
    expect(label('a_brand_new_member')).toBe('A Brand New Member');
  });

  it('returns empty string for null/undefined', () => {
    expect(label(null as unknown as string)).toBe('');
    expect(label(undefined as unknown as string)).toBe('');
  });
});

describe('the labels a devotee actually reads', () => {
  it('a booking awaiting payment does not say pending_payment', () => {
    expect(bookingStatusLabel('pending_payment')).toBe('Payment pending');
  });

  it('a booking with a pandit does not say priest_assigned', () => {
    expect(bookingStatusLabel('priest_assigned')).toBe('Pandit assigned');
  });

  it('the puja category from the storefront finding is covered', () => {
    // The literal value CM-10 measured on the web /pujas card metadata row.
    expect(pujaCategoryLabel('special_occasion')).toBe('Special occasions');
  });

  it('a subscription plan is a product name, not a price-book id', () => {
    expect(subscriptionPlanLabel('bhakti_pass_monthly')).toBe('Bhakti Pass · Monthly');
  });

  it('a provider role is a job, not a database constant', () => {
    expect(userRoleLabel('WELLNESS_INSTRUCTOR')).toBe('Wellness instructor');
    expect(userRoleLabel('PANDIT')).toBe('Pandit');
  });
});

// ─── 2. the sweep ───────────────────────────────────────────────────────────

const APP = path.resolve(__dirname, '../../app');

/**
 * Comments are blanked, not deleted, so reported line numbers still match the
 * file on disk. Blanking also means the paragraph above — which names
 * `pending_payment` and `WELLNESS_INSTRUCTOR` — cannot itself trip the sweep.
 * That bug class has bitten this engagement repeatedly.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/** The `={ … }` body starting at the `{` at `open`, brace-matched. */
function braceSpan(src: string, open: number): { text: string; end: number } | null {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return { text: src.slice(open + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Only places whose contents become VISIBLE TEXT: a `<Text>` body, one of the
 * text-valued props the shared list primitives take, and the `label:` of the
 * `status={{ label, color }}` object those primitives render as a pill.
 *
 * Deliberately not "every mention of `.status` in the file": comparisons
 * (`s.status === 'paid'`), colour lookups (`STATUS_COLOR[t.status]`) and HTTP
 * reads (`res.status`) are not renders, and a sweep that flagged them would be
 * turned off within a week.
 */
const ENUM_FIELD = /([A-Za-z_$][\w$]*)\.(status|category|role|plan|tier|type|level)\b/g;

/** The expression is the argument of a label call, possibly via one narrower. */
const WRAPPED = /(Label|humanizeEnum)\(\s*(?:[A-Za-z_$][\w$]*\(\s*)?$/;

interface Violation {
  file: string;
  line: number;
  kind: string;
  expr: string;
}

function displaySegments(src: string): Array<{ kind: string; text: string; index: number }> {
  const segs: Array<{ kind: string; text: string; index: number }> = [];
  for (const m of src.matchAll(/<Text\b[^>]*>([\s\S]*?)<\/Text>/g)) {
    segs.push({ kind: 'Text', text: m[1]!, index: m.index! });
  }
  for (const m of src.matchAll(/\b(primary|secondary|label|title|subtitle)=\{/g)) {
    const span = braceSpan(src, m.index! + m[0].length - 1);
    if (span) segs.push({ kind: `${m[1]}=`, text: span.text, index: m.index! });
  }
  for (const m of src.matchAll(/\blabel:\s*([^,}\n]+)/g)) {
    segs.push({ kind: 'label:', text: m[1]!, index: m.index! });
  }
  return segs;
}

function scan(): Violation[] {
  const out: Violation[] = [];
  const seen = new Set<string>();
  for (const file of walk(APP)) {
    const src = stripComments(readFileSync(file, 'utf8'));
    const lineAt = (i: number) => src.slice(0, i).split('\n').length;
    for (const seg of displaySegments(src)) {
      for (const m of seg.text.matchAll(ENUM_FIELD)) {
        const before = seg.text.slice(0, m.index!);
        const after = seg.text.slice(m.index! + m[0].length);
        // Already routed through this module (or apps/web's equivalent name).
        // Already routed through this module. One level of nesting is
        // allowed because a screen holding an `unknown` has to narrow first:
        // `bookingStatusLabel(text(b.status))`. Two levels is not — the point
        // is that the OUTERMOST call is a label.
        if (WRAPPED.test(before)) continue;
        // A comparison is not a render.
        if (/^\s*[=!]==?/.test(after)) continue;
        // A COMPUTED MEMBER read is a lookup key, not text: `COLORS[t.status]`.
        // An ARRAY LITERAL is text: `[s.type, …].join(' · ')`. The difference
        // is whether the character before `[` closes an expression.
        if (/(?:[A-Za-z0-9_$)\]])\[\s*$/.test(before)) continue;
        const rel = path.relative(APP, file).split(path.sep).join('/');
        const line = lineAt(seg.index) + seg.text.slice(0, m.index!).split('\n').length - 1;
        const key = `${rel}:${line}:${m[0]}:${seg.kind}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ file: rel, line, kind: seg.kind, expr: m[0] });
      }
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

describe('no screen renders a stored enum value raw', () => {
  it('the sweep is looking at a real tree', () => {
    // A silently-empty file list would make the assertion below vacuous, which
    // is exactly how a guard like this dies.
    const files = walk(APP);
    expect(files.length).toBeGreaterThan(60);
    expect(files.some((f) => f.endsWith('bookings.tsx'))).toBe(true);
  });

  it('the nesting allowance accepts a label call and nothing else', () => {
    // Non-vacuity for the one relaxation in the detector. `text()` narrows an
    // `unknown` before the label can take it; `statusColor()` is not a label at
    // all and must still be caught.
    const at = (src: string) => src.slice(0, src.indexOf('b.status'));
    expect(WRAPPED.test(at('bookingStatusLabel(b.status)'))).toBe(true);
    expect(WRAPPED.test(at('bookingStatusLabel(text(b.status))'))).toBe(true);
    expect(WRAPPED.test(at('text(b.status)'))).toBe(false);
    expect(WRAPPED.test(at('statusColor(b.status)'))).toBe(false);
    expect(WRAPPED.test(at('String(text(b.status))'))).toBe(false);
  });

  it('the sweep can still see a violation when one exists', () => {
    // Non-vacuity: the detector must fire on the exact shape it was written
    // for, independent of what the tree currently contains.
    const sample = '<Text style={s.x}>{b.status}</Text>';
    const hits = [...sample.matchAll(ENUM_FIELD)];
    expect(hits.map((h) => h[0])).toEqual(['b.status']);
    const wrapped = 'bookingStatusLabel(b.status)';
    expect(WRAPPED.test(wrapped.slice(0, wrapped.indexOf('b.status')))).toBe(true);
  });

  it('every enum-valued field reaching visible text goes through a label', () => {
    const violations = scan();
    const rendered = violations.map((v) => `${v.file}:${v.line} [${v.kind}] ${v.expr}`);
    expect(rendered, `${rendered.length} raw enum render site(s)`).toEqual([]);
  });
});
