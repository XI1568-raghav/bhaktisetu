import { prisma } from '../lib/prisma.js';

/**
 * The standard offering set that makes any registered temple bookable.
 *
 * Owner decision (2026-10-06): the Book Puja CTA is never hidden. On
 * production 15 of 20 temples had zero TemplePujaOffering rows, so the CTA led
 * to an empty list. Every temple therefore gets the same five common domestic
 * pujas from the existing PujaType catalogue, with no assigned priest, so the
 * resulting bookings land in the open pandit pool like any other.
 *
 * KEEP IN SYNC with ops/sql/seed-default-temple-offerings.sql (a test parses
 * that file and fails if the two lists or the slot list drift).
 *
 * Prices are not copied: priceOverride stays NULL so the offering follows
 * PujaType.basePrice (NRI price is derived, see lib/nri-pricing.ts).
 */
export const STANDARD_OFFERING_PUJA_SLUGS = [
  'hanuman-chalisa-path',
  'ganesh-puja',
  'lakshmi-puja',
  'rudrabhishek',
  'satyanarayan-katha',
] as const;

/** Same slot list the catalogue seed gives every curated temple offering. */
export const STANDARD_OFFERING_SLOTS = [
  '06:00',
  '07:00',
  '08:00',
  '12:00',
  '13:00',
  '17:00',
  '18:00',
] as const;

export const STANDARD_OFFERING_MAX_PER_SLOT = 5;

export interface StandardOfferingsResult {
  added: number;
  /** Standard pujas the temple already had a row for (active or not): left untouched. */
  alreadyPresent: number;
  /** Standard puja slugs missing from the catalogue (or inactive), so not added. */
  missingFromCatalogue: string[];
}

/**
 * Add the standard offerings a temple does not already have a row for.
 * Idempotent and strictly additive: an existing TemplePujaOffering (including
 * a deliberately deactivated one) is never updated, re-activated or repriced.
 * Returns null when the temple does not exist.
 */
export async function addStandardOfferings(
  templeId: string,
): Promise<StandardOfferingsResult | null> {
  const temple = await prisma.temple.findUnique({
    where: { id: templeId },
    select: { id: true },
  });
  if (!temple) return null;

  const pujaTypes = await prisma.pujaType.findMany({
    where: { slug: { in: [...STANDARD_OFFERING_PUJA_SLUGS] }, isActive: true },
    select: { id: true, slug: true },
    take: 50,
  });
  const existing = await prisma.templePujaOffering.findMany({
    where: { templeId, pujaTypeId: { in: pujaTypes.map((p) => p.id) } },
    select: { pujaTypeId: true },
    take: 50,
  });
  const have = new Set(existing.map((e) => e.pujaTypeId));
  const toCreate = pujaTypes.filter((p) => !have.has(p.id));

  if (toCreate.length > 0) {
    await prisma.templePujaOffering.createMany({
      data: toCreate.map((p) => ({
        templeId,
        pujaTypeId: p.id,
        availableSlots: [...STANDARD_OFFERING_SLOTS],
        maxBookingsPerSlot: STANDARD_OFFERING_MAX_PER_SLOT,
        isActive: true,
      })),
      // The (templeId, pujaTypeId) unique key makes a concurrent double-click
      // a no-op rather than an error.
      skipDuplicates: true,
    });
  }

  const found = new Set(pujaTypes.map((p) => p.slug));
  return {
    added: toCreate.length,
    alreadyPresent: pujaTypes.length - toCreate.length,
    missingFromCatalogue: STANDARD_OFFERING_PUJA_SLUGS.filter((s) => !found.has(s)),
  };
}
