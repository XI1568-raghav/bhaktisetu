/**
 * API mirror of apps/web/lib/launch-gates.ts, for claims the API itself serves.
 * FALSE while the thing named does not exist; while false the response states
 * only what is true today. The copy stays in source behind the flag.
 *
 *   HAS_ADOPTION_EXTRAS      gaushala plans: donor wall, seva certificate,
 *                            photo/video updates, health reports, visits, name
 *                            plaque, Gau Puja invitation. No donation attaches a
 *                            donor to a cow and no endpoint lets a gaushala post
 *                            an update or issue a certificate.
 *   HAS_WELLNESS_PROGRAM_PACKAGES  wellness programme `features` (certificates,
 *                            workbooks, recordings, libraries). `/wellness/programs`
 *                            is a fixture list with no enrolment behind it.
 */
export const HAS_ADOPTION_EXTRAS = false;
export const HAS_WELLNESS_PROGRAM_PACKAGES = false;
