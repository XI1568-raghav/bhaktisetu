import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  searchPeople,
  type ApolloPerson,
  type ApolloPersonQuery,
} from '../services/apollo.service.js';

/**
 * Weekly Apollo lead refresh. Mirrors the 5-ICP set used by
 * `scripts/leads/enrich-from-apollo.ts` but, instead of writing a TS file,
 * upserts directly into the `Lead` table by `(role, email)` (the Prisma
 * unique).
 *
 * Free-tier safe:
 *   - 5 ICPs × per_page 10 × 1 page = up to 50 Apollo credits per run
 *   - In-process 7-day cooldown via `maybeRunApolloRefresh()`
 *   - Missing APOLLO_API_KEY → returns `{ skipped: true }`, never throws
 *
 * Wired into the master cron's `runDailyOps()`. The 7-day gate keeps us
 * under the 60-credits/month free quota even if the master tick runs every
 * 30 minutes.
 */

type LeadRole =
  | 'TEMPLE'
  | 'PRIEST'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'GAUSHALA';

interface ICP {
  varName: 'TEMPLES' | 'PRIESTS' | 'ASTROLOGERS' | 'WELLNESS' | 'GAUSHALAS';
  role: LeadRole;
  query: ApolloPersonQuery;
}

const ICPS: ICP[] = [
  {
    varName: 'TEMPLES',
    role: 'TEMPLE',
    query: {
      q_organization_keyword_tags: ['temple', 'mandir'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
  {
    varName: 'GAUSHALAS',
    role: 'GAUSHALA',
    query: {
      q_organization_keyword_tags: ['gaushala'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
  {
    varName: 'ASTROLOGERS',
    role: 'ASTROLOGER',
    query: {
      q_organization_keyword_tags: ['astrologer'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
  {
    varName: 'WELLNESS',
    role: 'WELLNESS_INSTRUCTOR',
    query: {
      q_organization_keyword_tags: ['wellness'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
  {
    varName: 'PRIESTS',
    role: 'PRIEST',
    query: {
      q_organization_keyword_tags: ['priest', 'pandit'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
];

const PER_PAGE = Math.max(
  1,
  Math.min(100, Number(process.env.APOLLO_PER_PAGE ?? 10)),
);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Render runs a single API instance; in-process cooldown is sufficient.
// Replace with a `cron_runs` row if we ever scale horizontally.
let lastRunAt: number | null = null;

export interface ApolloRefreshResult {
  skipped?: boolean;
  reason?: string;
  ran?: boolean;
  newLeads: number;
  skippedExisting: number;
  perIcp: Array<{ icp: string; fetched: number; created: number; existing: number }>;
  errors: string[];
}

interface UpsertCounts {
  created: number;
  existing: number;
}

async function upsertLead(
  role: LeadRole,
  person: ApolloPerson,
  icpVarName: string,
): Promise<'created' | 'existing'> {
  const email = person.email;
  if (!email) return 'existing';

  const existing = await prisma.lead.findUnique({
    where: { role_email: { role, email } },
    select: { id: true },
  });

  const metadata: Prisma.InputJsonValue = {
    apolloIcp: icpVarName.toLowerCase(),
    title: person.title ?? null,
    organization: person.organization ?? null,
  };

  await prisma.lead.upsert({
    where: { role_email: { role, email } },
    create: {
      role,
      name: person.name,
      email,
      city: person.location,
      source: 'apollo.io',
      sourceUrl: 'https://app.apollo.io/',
      metadata,
    },
    update: {
      // Keep the existing row but refresh enrichment metadata.
      name: person.name,
      city: person.location,
      metadata,
    },
  });

  return existing ? 'existing' : 'created';
}

async function fetchAndUpsertIcp(icp: ICP): Promise<{
  fetched: number;
  counts: UpsertCounts;
  errors: string[];
}> {
  const counts: UpsertCounts = { created: 0, existing: 0 };
  const errors: string[] = [];

  let people: ApolloPerson[] = [];
  try {
    people = await searchPeople({ ...icp.query, per_page: PER_PAGE, page: 1 });
  } catch (err) {
    errors.push(
      `[${icp.varName}] search failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { fetched: 0, counts, errors };
  }

  for (const person of people) {
    if (!person.email) continue;
    try {
      const outcome = await upsertLead(icp.role, person, icp.varName);
      if (outcome === 'created') counts.created++;
      else counts.existing++;
    } catch (err) {
      errors.push(
        `[${icp.varName}] upsert ${person.email} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return { fetched: people.length, counts, errors };
}

/**
 * Run the Apollo refresh now, ignoring the cooldown. Used by the admin
 * manual-trigger route. Always resolves — never throws.
 */
export async function refreshApolloLeads(): Promise<ApolloRefreshResult> {
  if (!process.env.APOLLO_API_KEY) {
    return {
      skipped: true,
      reason: 'no api key',
      newLeads: 0,
      skippedExisting: 0,
      perIcp: [],
      errors: [],
    };
  }

  const perIcp: ApolloRefreshResult['perIcp'] = [];
  const errors: string[] = [];
  let newLeads = 0;
  let skippedExisting = 0;

  for (const icp of ICPS) {
    try {
      const r = await fetchAndUpsertIcp(icp);
      newLeads += r.counts.created;
      skippedExisting += r.counts.existing;
      errors.push(...r.errors);
      perIcp.push({
        icp: icp.varName,
        fetched: r.fetched,
        created: r.counts.created,
        existing: r.counts.existing,
      });
    } catch (err) {
      errors.push(
        `[${icp.varName}] icp run failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      perIcp.push({ icp: icp.varName, fetched: 0, created: 0, existing: 0 });
    }
  }

  lastRunAt = Date.now();
  return { ran: true, newLeads, skippedExisting, perIcp, errors };
}

/**
 * Cooldown-gated wrapper. Skips if the last successful run was less than
 * 7 days ago. Master cron calls this; admin manual trigger calls
 * `refreshApolloLeads()` directly.
 */
export async function maybeRunApolloRefresh(): Promise<ApolloRefreshResult> {
  if (!process.env.APOLLO_API_KEY) {
    return {
      skipped: true,
      reason: 'no api key',
      newLeads: 0,
      skippedExisting: 0,
      perIcp: [],
      errors: [],
    };
  }
  const now = Date.now();
  if (lastRunAt !== null && now - lastRunAt < SEVEN_DAYS_MS) {
    const remainingMs = SEVEN_DAYS_MS - (now - lastRunAt);
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return {
      skipped: true,
      reason: `cooling down, ${remainingDays}d remain`,
      newLeads: 0,
      skippedExisting: 0,
      perIcp: [],
      errors: [],
    };
  }
  return refreshApolloLeads();
}

/** Test-only — reset the in-process 7-day gate. */
export function __resetApolloRefreshCooldown(): void {
  lastRunAt = null;
}
