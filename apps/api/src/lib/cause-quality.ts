/**
 * Minimum-quality gate for donation causes (gaushala / temple profiles).
 *
 * Production once listed a gaushala named "saharanpur" with the description
 * "skkss" and address "ssdwdqe" under a "Every cause verified by our team"
 * badge, with a live Donate button. This is deliberately a dumb, explainable
 * length/word check: no entropy or dictionary heuristics, because Indian and
 * Devanagari names must never be rejected for "looking random".
 *
 * Pure: no I/O, so it is shared by the approval path, the public listing and
 * the donation-order path.
 */

export const CAUSE_QUALITY_RULES = {
  nameMinChars: 3,
  descriptionMinChars: 20,
  // 3, not 4: real onboarded profiles use terse descriptions such as
  // "ISKCON-affiliated cow shelter." (3 words). The junk record has 1.
  descriptionMinWords: 3,
  addressMinChars: 10,
} as const;

export type CauseQualityReason =
  | 'name_too_short'
  | 'name_no_letter'
  | 'description_too_short'
  | 'description_too_few_words'
  | 'address_too_short';

export interface CauseQualityInput {
  name?: string | null;
  description?: string | null;
  address?: string | null;
}

export interface CauseQualityResult {
  ok: boolean;
  reasons: CauseQualityReason[];
}

export function assessCauseQuality(input: CauseQualityInput): CauseQualityResult {
  const name = (input.name ?? '').trim();
  const description = (input.description ?? '').trim();
  const address = (input.address ?? '').trim();
  const reasons: CauseQualityReason[] = [];

  if (name.length < CAUSE_QUALITY_RULES.nameMinChars) reasons.push('name_too_short');
  // \p{L} covers every script, so Devanagari names pass.
  if (!/\p{L}/u.test(name)) reasons.push('name_no_letter');

  if (description.length < CAUSE_QUALITY_RULES.descriptionMinChars) {
    reasons.push('description_too_short');
  }
  const words = description.split(/\s+/).filter(Boolean).length;
  if (words < CAUSE_QUALITY_RULES.descriptionMinWords) reasons.push('description_too_few_words');

  if (address.length < CAUSE_QUALITY_RULES.addressMinChars) reasons.push('address_too_short');

  return { ok: reasons.length === 0, reasons };
}

/** Thrown when an approval is refused because a cause profile is below the bar. */
export class CauseQualityError extends Error {
  readonly reasons: CauseQualityReason[];
  readonly role: string;
  constructor(role: string, reasons: CauseQualityReason[]) {
    super(`Cannot approve: ${role} profile fails the quality check (${reasons.join(', ')})`);
    this.name = 'CauseQualityError';
    this.role = role;
    this.reasons = reasons;
  }
}

export function gaushalaQuality(p: {
  gaushalaName?: string | null;
  description?: string | null;
  address?: string | null;
}): CauseQualityResult {
  return assessCauseQuality({ name: p.gaushalaName, description: p.description, address: p.address });
}

export function templeQuality(p: {
  templeName?: string | null;
  description?: string | null;
  address?: string | null;
}): CauseQualityResult {
  return assessCauseQuality({ name: p.templeName, description: p.description, address: p.address });
}

const REASON_TEXT: Record<CauseQualityReason, string> = {
  name_too_short: `the name needs at least ${CAUSE_QUALITY_RULES.nameMinChars} characters`,
  name_no_letter: 'the name must contain letters',
  description_too_short: `the description needs at least ${CAUSE_QUALITY_RULES.descriptionMinChars} characters`,
  description_too_few_words: `the description needs at least ${CAUSE_QUALITY_RULES.descriptionMinWords} words`,
  address_too_short: `the address needs at least ${CAUSE_QUALITY_RULES.addressMinChars} characters (full street and city)`,
};

/** The failing reasons as a plain-English list ("a; b"). */
export function describeQualityReasons(reasons: CauseQualityReason[]): string {
  return Array.from(new Set(reasons.map((r) => REASON_TEXT[r]))).join('; ');
}

/** Plain-English message for a failed quality check on an edit to an approved profile. */
export function describeQualityEditFailure(reasons: CauseQualityReason[]): string {
  const items = Array.from(new Set(reasons.map((r) => REASON_TEXT[r])));
  return `These changes were not saved because your profile is live and public. Please fix: ${items.join('; ')}.`;
}

/**
 * Edit-time gate. An approved profile that would fail the bar after `updates`
 * is applied must not be saved (and is not silently un-approved). Returns the
 * failing reasons, or null when the edit is fine or the profile is unapproved.
 */
export function qualityReasonsForEdit(
  kind: 'gaushala' | 'temple',
  current: Record<string, unknown> & { approved?: boolean | null },
  updates: Record<string, unknown>,
): CauseQualityReason[] | null {
  if (!current.approved) return null;
  const defined = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  const merged = { ...current, ...defined } as Record<string, string | null | undefined>;
  const verdict =
    kind === 'gaushala'
      ? gaushalaQuality({ gaushalaName: merged.gaushalaName, description: merged.description, address: merged.address })
      : templeQuality({ templeName: merged.templeName, description: merged.description, address: merged.address });
  return verdict.ok ? null : verdict.reasons;
}
