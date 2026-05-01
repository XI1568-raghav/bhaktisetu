import { PrismaClient, type LeadRole } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  const envPath = resolve(process.cwd(), '.env');
  const raw = readFileSync(envPath, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // ok in CI
}

export const USER_AGENT = 'Darshya Outreach Bot';
export const SLEEP_MS = 200;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const prisma = new PrismaClient();

export interface RawLead {
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string;
  phone?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  source: string;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export async function politeFetch(
  url: string,
  init?: RequestInit & { fetchImpl?: typeof fetch },
): Promise<Response> {
  const fetchImpl = init?.fetchImpl ?? fetch;
  const res = await fetchImpl(url, {
    ...init,
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/json,*/*',
      ...(init?.headers ?? {}),
    },
  });
  await sleep(SLEEP_MS);
  return res;
}

function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/[^\d+]/g, '');
  if (!digits) return null;
  return digits;
}

function normalizeEmail(e?: string | null): string | null {
  if (!e) return null;
  const t = e.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
}

export interface UpsertResult {
  scraped: number;
  skipped: number;
}

/**
 * Upserts a lead by [role, email] or [role, phone]. Returns whether a new row
 * was created. Idempotent — re-running with the same data is a no-op besides
 * metadata refresh.
 */
export async function upsertLead(
  client: Pick<PrismaClient, 'lead'>,
  role: LeadRole,
  raw: RawLead,
): Promise<'created' | 'skipped'> {
  const email = normalizeEmail(raw.email);
  const phone = normalizePhone(raw.phone);
  const whatsappNumber = normalizePhone(raw.whatsappNumber) ?? phone;

  if (!email && !phone) return 'skipped';

  const where = email
    ? { role_email: { role, email } }
    : { role_phone: { role, phone: phone! } };

  const existing = await (client.lead as any).findUnique({ where });
  if (existing) {
    await (client.lead as any).update({
      where: { id: existing.id },
      data: {
        metadata: { ...(existing.metadata as object), ...(raw.metadata ?? {}) },
        sourceUrl: raw.sourceUrl ?? existing.sourceUrl,
        whatsappNumber: whatsappNumber ?? existing.whatsappNumber,
      },
    });
    return 'skipped';
  }

  await (client.lead as any).create({
    data: {
      role,
      name: raw.name.trim(),
      city: raw.city ?? null,
      state: raw.state ?? null,
      country: raw.country ?? 'India',
      phone,
      email,
      whatsappNumber,
      source: raw.source,
      sourceUrl: raw.sourceUrl ?? null,
      metadata: raw.metadata ?? {},
    },
  });
  return 'created';
}

export async function runScrape(
  role: LeadRole,
  scraperName: string,
  fn: (ctx: { upsert: (raw: RawLead) => Promise<'created' | 'skipped'> }) => Promise<void>,
): Promise<UpsertResult> {
  let scraped = 0;
  let skipped = 0;
  const upsert = async (raw: RawLead) => {
    const r = await upsertLead(prisma, role, raw);
    if (r === 'created') scraped++;
    else skipped++;
    return r;
  };
  try {
    await fn({ upsert });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
  console.log(`[${scraperName}] scraped ${scraped} new, skipped ${skipped} dup`);
  return { scraped, skipped };
}

export const TOP_INDIAN_TEMPLE_CITIES: Array<{ city: string; state: string }> = [
  { city: 'Varanasi', state: 'Uttar Pradesh' },
  { city: 'Tirupati', state: 'Andhra Pradesh' },
  { city: 'Mathura', state: 'Uttar Pradesh' },
  { city: 'Vrindavan', state: 'Uttar Pradesh' },
  { city: 'Ayodhya', state: 'Uttar Pradesh' },
  { city: 'Haridwar', state: 'Uttarakhand' },
  { city: 'Rishikesh', state: 'Uttarakhand' },
  { city: 'Puri', state: 'Odisha' },
  { city: 'Dwarka', state: 'Gujarat' },
  { city: 'Ujjain', state: 'Madhya Pradesh' },
  { city: 'Madurai', state: 'Tamil Nadu' },
  { city: 'Kanchipuram', state: 'Tamil Nadu' },
  { city: 'Rameswaram', state: 'Tamil Nadu' },
  { city: 'Shirdi', state: 'Maharashtra' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Jodhpur', state: 'Rajasthan' },
  { city: 'Udaipur', state: 'Rajasthan' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Bhubaneswar', state: 'Odisha' },
  { city: 'Guwahati', state: 'Assam' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
  { city: 'Kanpur', state: 'Uttar Pradesh' },
];
