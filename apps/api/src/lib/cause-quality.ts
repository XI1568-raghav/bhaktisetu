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
