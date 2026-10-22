/**
 * Donation form validation, pure so it can be tested without a DOM.
 *
 * QA 2026-10-22 (devotee report): a donor with Rs 1,100 selected and a valid
 * 10-digit phone typed still saw "Minimum donation is Rs 101" and "Phone is
 * required". Cause: errors were computed once on submit and stored in state;
 * nothing cleared them when the field changed, so a first failed submit (blank
 * phone, an amount typed mid-edit) left red messages on screen after the donor
 * had fixed the values. A pasted "+91 88689 12697" was also truncated by
 * maxLength=10 before it could be normalised. Both are fixed in the form; the
 * rules live here so form and tests share one definition.
 */

export const MIN_INR = 101;
export const MAX_INR = 1_000_000;
export const PAN_THRESHOLD_INR = 2000;

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "1,100", "₹ 1100", "1100.0" -> 1100. Anything unparseable -> 0. */
export function parseAmount(raw: string | number): number {
  const cleaned = String(raw).replace(/[₹,\s]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

/** Keep digits only and drop a +91 / 91 / 0 prefix so a pasted number validates. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) return digits.slice(2, 12);
  if (digits.length > 10 && digits.startsWith('0')) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

export interface DonationFormValues {
  amount: string | number;
  name: string;
  email: string;
  phone: string;
  pan: string;
  /** donationLegal.HAS_80G_VERIFIED: PAN is only mandatory when an 80G receipt can be issued. */
  hasTaxReceipt: boolean;
}

export function validateDonation(v: DonationFormValues): Record<string, string> {
  const errs: Record<string, string> = {};
  const amount = parseAmount(v.amount);

  if (!amount || amount < MIN_INR) {
    errs.amount = `Minimum donation is ₹${MIN_INR}`;
  } else if (amount > MAX_INR) {
    errs.amount = `Maximum single donation via this form is ₹${MAX_INR.toLocaleString('en-IN')}`;
  }

  if (!v.name.trim()) {
    errs.donorName = 'Name is required for your receipt';
  }

  if (!v.email.trim()) errs.donorEmail = 'Email is required to send the receipt';
  else if (!EMAIL_REGEX.test(v.email.trim())) errs.donorEmail = 'Enter a valid email address';

  const phone = normalizePhone(v.phone);
  if (!phone) errs.donorPhone = 'Phone is required';
  else if (!PHONE_REGEX.test(phone)) errs.donorPhone = 'Enter a valid 10-digit Indian phone number';

  // PAN is mandatory only where it has a legal purpose (an 80G receipt). With
  // no 80G registration on file, demanding a sensitive identifier is the
  // misrepresentation COM-02/COM-04 named, so it stays optional (format
  // checked when given) and the API never requires it.
  const pan = v.pan.trim().toUpperCase();
  if (pan) {
    if (!PAN_REGEX.test(pan)) errs.donorPan = 'Invalid PAN format (e.g. ABCDE1234F)';
  } else if (v.hasTaxReceipt && amount >= PAN_THRESHOLD_INR) {
    errs.donorPan = 'PAN is required on donations of ₹2,000 or more';
  }

  return errs;
}
