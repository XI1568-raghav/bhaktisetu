/**
 * Launch gates for product claims that have no code behind them yet.
 *
 * Each flag is FALSE while the thing it names does not exist. While false the
 * page says what is true today (or "coming soon") and the richer copy stays in
 * the source behind the flag, so turning a feature on later is a one-line flip
 * plus the work that backs it. Nothing here deletes copy.
 *
 * Guarded by `__tests__/copy-truth-sweep.test.ts` (section 5). The API has its
 * own mirror for the gaushala plans and wellness programs it serves:
 * apps/api/src/lib/launch-gates.ts.
 *
 *   HAS_ADOPTION_EXTRAS      donor wall, seva certificate, photo/video updates,
 *                            health reports, visits, plaque, Gau Puja invite.
 *                            Nothing records an adopter against a cow, nothing
 *                            lets a gaushala post updates, nothing issues a
 *                            certificate. Flip when those exist.
 *   HAS_HOME_PUJA_INCLUSIONS "pandit brings all samagri", "prasadam included",
 *                            per-tier kits. The home-puja wizard is a callback
 *                            request (no priest offering, no payment), so none of
 *                            it is a commitment anyone has made. Flip when home
 *                            pujas are bookable against real offerings.
 *   HAS_PUJA_MATERIALS_PROMISE  "Samagri included" / "all puja materials are arranged by the
 *                            temple" on temple puja pages. A booking records the
 *                            puja fee, the ₹51 platform fee and an optional
 *                            ₹150 prasad add-on; it records no materials. Flip when an
 *                            offering carries a materials commitment the temple has made.
 *   HAS_PACKAGE_INCLUSIONS   hotel / transport / guide / meals / certificate /
 *                            materials lists on /yatra, /yatra-packages and the
 *                            wellness pages. No stock or supplier confirmation
 *                            exists behind them. Flip when a package is backed by
 *                            confirmed inventory and an online booking.
 *   HAS_VERIFIED_TESTIMONIALS  customer quotes on /weddings. No wedding has been booked and
 *                            rated through the product, so no quote has a source.
 *                            Flip when quotes come from recorded, consented reviews.
 *   HAS_VERIFIED_INSTRUCTORS  years of experience, certifications, ratings and reviews on
 *                            /wellness/instructors/[id]. The profiles are fixtures, not
 *                            real instructors. Flip when profiles come from verified
 *                            instructor records.
 *   HAS_COMPANION_VETTING    ID, police-verification and first-aid checks for
 *                            yatra companions. No such process exists and no
 *                            companion is listed. Flip when one does.
 */
export const HAS_ADOPTION_EXTRAS = false;
export const HAS_HOME_PUJA_INCLUSIONS = false;
export const HAS_PUJA_MATERIALS_PROMISE = false;
export const HAS_PACKAGE_INCLUSIONS = false;
export const HAS_COMPANION_VETTING = false;
export const HAS_VERIFIED_TESTIMONIALS = false;
export const HAS_VERIFIED_INSTRUCTORS = false;

/** Shown on fixture instructor profiles while HAS_VERIFIED_INSTRUCTORS is false. */
export const SAMPLE_INSTRUCTOR_NOTE =
  'Sample profile: this page illustrates how an instructor listing will look. It is not a verified instructor, and no credentials, ratings or reviews are claimed.';

/** Shown wherever an inclusions list is held back by one of the gates above. */
export const INCLUSIONS_ON_ENQUIRY =
  'What a booking includes is confirmed by our team when you enquire. Nothing is held or charged until then.';
