import { z } from 'zod';

/**
 * Apollo.io people-search service.
 *
 * Free tier = 60 credits/month. Default page size 10, page 1, so a single
 * `searchPeople` call costs up to 10 credits (1 per surfaced person).
 *
 * Env:
 *   APOLLO_API_KEY  — required. If absent, every public method returns []
 *                     and logs a warn. Never throws on missing key.
 *
 * Compliance: we deliberately drop phone numbers from Apollo responses.
 * Email-only persistence per docs/leads-pipeline.md.
 */

const APOLLO_BASE = 'https://api.apollo.io/v1';

export interface ApolloPersonQuery {
  q_organization_keyword_tags?: string[];
  person_titles?: string[];
  person_locations?: string[];
  per_page?: number;
  page?: number;
}

export interface ApolloPerson {
  name: string;
  email: string | null;
  title: string | null;
  organization: string | null;
  location: string | null;
}

const ApolloPersonRaw = z
  .object({
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    name: z.string().nullish(),
    email: z.string().nullish(),
    title: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    country: z.string().nullish(),
    organization: z
      .object({
        name: z.string().nullish(),
      })
      .nullish(),
  })
  .passthrough();

const ApolloSearchResponse = z
  .object({
    people: z.array(ApolloPersonRaw).nullish(),
    contacts: z.array(ApolloPersonRaw).nullish(),
  })
  .passthrough();

function buildName(p: z.infer<typeof ApolloPersonRaw>): string | null {
  if (p.name && p.name.trim()) return p.name.trim();
  const parts = [p.first_name, p.last_name].filter(
    (s): s is string => !!s && s.trim().length > 0,
  );
  return parts.length ? parts.join(' ').trim() : null;
}

function buildLocation(p: z.infer<typeof ApolloPersonRaw>): string | null {
  const parts = [p.city, p.state, p.country].filter(
    (s): s is string => !!s && s.trim().length > 0,
  );
  return parts.length ? parts.join(', ') : null;
}

function isUsableEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  const t = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return false;
  // Apollo returns "email_not_unlocked@domain.com" style placeholders for
  // contacts behind a paywall — drop those.
  if (t.startsWith('email_not_unlocked')) return false;
  return true;
}

/**
 * Search Apollo for people matching `query`. Returns a flat normalized array.
 * Never throws — on any error (network, validation, missing key, non-2xx),
 * logs a warning and returns [].
 */
export async function searchPeople(
  query: ApolloPersonQuery,
): Promise<ApolloPerson[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.warn(
      '[apollo] APOLLO_API_KEY not set — searchPeople returning []',
    );
    return [];
  }

  const body = {
    q_organization_keyword_tags: query.q_organization_keyword_tags,
    person_titles: query.person_titles,
    person_locations: query.person_locations,
    per_page: query.per_page ?? 10,
    page: query.page ?? 1,
  };

  try {
    const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'X-Api-Key': apiKey,
        'cache-control': 'no-cache',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn(
        `[apollo] search failed: ${res.status} ${res.statusText} ${txt.slice(0, 200)}`,
      );
      return [];
    }

    const json: unknown = await res.json();
    const parsed = ApolloSearchResponse.safeParse(json);
    if (!parsed.success) {
      console.warn(
        `[apollo] response validation failed: ${parsed.error.message.slice(0, 200)}`,
      );
      return [];
    }

    const rows = [
      ...(parsed.data.people ?? []),
      ...(parsed.data.contacts ?? []),
    ];

    const out: ApolloPerson[] = [];
    for (const r of rows) {
      const name = buildName(r);
      if (!name) continue;
      const email = isUsableEmail(r.email) ? r.email!.trim().toLowerCase() : null;
      out.push({
        name,
        email,
        title: r.title?.trim() || null,
        organization: r.organization?.name?.trim() || null,
        location: buildLocation(r),
      });
    }
    return out;
  } catch (err) {
    console.warn(
      `[apollo] search threw: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

export const __test__ = { ApolloSearchResponse, isUsableEmail, buildName, buildLocation };
