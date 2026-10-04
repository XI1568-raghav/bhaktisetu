/**
 * The body `POST /api/v1/gurukul-applications` accepts — built once, testable.
 *
 * THE CONTRACT, VERBATIM (apps/api/src/routes/gurukul-applications.ts:11-29):
 *
 *   programId            z.string().uuid()
 *   applicantType        z.enum(['self','parent'])
 *   studentName          z.string().min(2).max(120)
 *   studentAgeYears      z.number().int().min(3).max(80)
 *   studentEmail         z.string().email().optional()
 *   guardianName         z.string().min(2).max(120).optional()
 *   guardianRelation     z.string().min(2).max(40).optional()
 *   guardianPhone        z.string().min(8).max(20).optional()
 *   guardianAadhaarLast4 z.string().regex(/^\d{4}$/).optional()
 *   consentSigned        z.boolean()
 *   statement            z.string().min(20).max(4000)
 *
 *   .refine:
 *     if (age < 18 && applicantType !== 'parent') -> REJECT
 *     if (age < 18 || applicantType === 'parent')
 *        -> guardianName && guardianRelation && guardianPhone && consentSigned
 *     else -> consentSigned
 *
 * THE BUG THIS EXISTS FOR
 * -----------------------
 * `app/(devotee)/gurukul-apply.tsx` computed `isMinor = age < 18 ||
 * applicantType === 'parent'` and used it ONLY to reveal the guardian
 * fieldset. It never changed `applicantType`, so a devotee who left the picker
 * on "Self" and entered an age under 18 posted
 * `{applicantType:'self', studentAgeYears:16}` — the exact combination the
 * refine's first clause rejects. Every such application 400'd, and the screen
 * showed the raw zod `flatten()` JSON in an `Alert`.
 *
 * A zod enum does not coerce and a zod refine does not negotiate, so the only
 * place this can be got right is before the request. It lives here rather than
 * in the screen because apps/mobile's vitest runner is node-only and renders no
 * React Native — a rule that lives in a .tsx file is one nothing can check.
 */

export class GurukulApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GurukulApplicationError';
  }
}

export interface GurukulApplicationForm {
  programId: string;
  /** What the picker says. Overridden to 'parent' for a minor — see below. */
  applicantType: 'self' | 'parent';
  studentName: string;
  /** Raw text off a numeric keypad. */
  studentAgeYears: string;
  studentEmail?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
  guardianAadhaarLast4?: string;
  consentSigned: boolean;
  statement: string;
}

export interface GurukulApplicationBody {
  programId: string;
  applicantType: 'self' | 'parent';
  studentName: string;
  studentAgeYears: number;
  consentSigned: true;
  statement: string;
  studentEmail?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
  guardianAadhaarLast4?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the route will demand guardian details for this form. */
export function guardianRequired(applicantType: 'self' | 'parent', age: number): boolean {
  return age < 18 || applicantType === 'parent';
}

/**
 * The applicant type that can actually succeed.
 *
 * A minor is ALWAYS submitted as a parent application because the refine
 * refuses anything else. This is not a silent correction of the devotee's
 * choice: the screen disables the picker and says why once the age is under 18.
 */
export function effectiveApplicantType(
  applicantType: 'self' | 'parent',
  age: number,
): 'self' | 'parent' {
  return age > 0 && age < 18 ? 'parent' : applicantType;
}

export function buildGurukulApplication(form: GurukulApplicationForm): GurukulApplicationBody {
  const programId = form.programId?.trim() ?? '';
  if (!UUID_RE.test(programId)) {
    throw new GurukulApplicationError('Could not identify the program. Go back and pick one.');
  }

  const studentName = form.studentName?.trim() ?? '';
  if (studentName.length < 2 || studentName.length > 120) {
    throw new GurukulApplicationError('Enter the student name (2-120 characters).');
  }

  const age = Number(String(form.studentAgeYears ?? '').trim());
  if (!Number.isInteger(age) || age < 3 || age > 80) {
    throw new GurukulApplicationError('Student age must be a whole number between 3 and 80.');
  }

  const statement = form.statement?.trim() ?? '';
  if (statement.length < 20 || statement.length > 4000) {
    throw new GurukulApplicationError('The statement of intent must be 20-4000 characters.');
  }

  if (!form.consentSigned) {
    throw new GurukulApplicationError('Please tick the consent box.');
  }

  const applicantType = effectiveApplicantType(form.applicantType, age);
  const body: GurukulApplicationBody = {
    programId,
    applicantType,
    studentName,
    studentAgeYears: age,
    consentSigned: true,
    statement,
  };

  const email = form.studentEmail?.trim() ?? '';
  if (email.length > 0) {
    if (!EMAIL_RE.test(email)) {
      throw new GurukulApplicationError('Enter a valid student email, or leave it blank.');
    }
    body.studentEmail = email;
  }

  if (guardianRequired(applicantType, age)) {
    const guardianName = form.guardianName?.trim() ?? '';
    const guardianRelation = form.guardianRelation?.trim() ?? '';
    const guardianPhone = form.guardianPhone?.trim() ?? '';
    if (guardianName.length < 2 || guardianName.length > 120) {
      throw new GurukulApplicationError('Enter the guardian name (2-120 characters).');
    }
    if (guardianRelation.length < 2 || guardianRelation.length > 40) {
      throw new GurukulApplicationError('Enter the guardian relation, e.g. Father or Mother.');
    }
    if (guardianPhone.length < 8 || guardianPhone.length > 20) {
      throw new GurukulApplicationError('Enter a guardian phone number of 8-20 characters.');
    }
    body.guardianName = guardianName;
    body.guardianRelation = guardianRelation;
    body.guardianPhone = guardianPhone;

    const aadhaar = form.guardianAadhaarLast4?.trim() ?? '';
    if (aadhaar.length > 0) {
      if (!/^\d{4}$/.test(aadhaar)) {
        throw new GurukulApplicationError(
          'Enter exactly the last 4 Aadhaar digits, or leave it blank.',
        );
      }
      body.guardianAadhaarLast4 = aadhaar;
    }
  }

  return body;
}
