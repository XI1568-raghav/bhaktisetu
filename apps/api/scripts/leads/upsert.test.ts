import { describe, it, expect, vi } from 'vitest';
import { upsertLead, type RawLead } from './_shared.js';

function makeStubClient() {
  const rows: any[] = [];
  return {
    rows,
    lead: {
      findUnique: vi.fn(async ({ where }: { where: any }) => {
        if (where.role_email) {
          return rows.find(
            (r) =>
              r.role === where.role_email.role && r.email === where.role_email.email,
          ) ?? null;
        }
        if (where.role_phone) {
          return rows.find(
            (r) =>
              r.role === where.role_phone.role && r.phone === where.role_phone.phone,
          ) ?? null;
        }
        if (where.id) {
          return rows.find((r) => r.id === where.id) ?? null;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        const row = { id: `id-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: any; data: any }) => {
        const idx = rows.findIndex((r) => r.id === where.id);
        rows[idx] = { ...rows[idx], ...data };
        return rows[idx];
      }),
    },
  };
}

describe('upsertLead', () => {
  it('creates a new lead when none matches', async () => {
    const client = makeStubClient();
    const raw: RawLead = {
      name: 'Test Pandit',
      city: 'Delhi',
      email: 'pandit@example.com',
      source: 'unit-test',
    };
    const r = await upsertLead(client as any, 'PRIEST' as any, raw);
    expect(r).toBe('created');
    expect(client.rows).toHaveLength(1);
    expect(client.rows[0]).toMatchObject({
      role: 'PRIEST',
      email: 'pandit@example.com',
      city: 'Delhi',
    });
  });

  it('skips when matching email + role already exists', async () => {
    const client = makeStubClient();
    const raw: RawLead = {
      name: 'Test Pandit',
      email: 'dup@example.com',
      source: 'unit-test',
    };
    expect(await upsertLead(client as any, 'PRIEST' as any, raw)).toBe('created');
    expect(await upsertLead(client as any, 'PRIEST' as any, raw)).toBe('skipped');
    expect(client.rows).toHaveLength(1);
  });

  it('skips silently when neither email nor phone is provided', async () => {
    const client = makeStubClient();
    const r = await upsertLead(client as any, 'TEMPLE' as any, {
      name: 'No Contact Temple',
      source: 'unit-test',
    });
    expect(r).toBe('skipped');
    expect(client.rows).toHaveLength(0);
  });

  it('matches by phone when no email is set', async () => {
    const client = makeStubClient();
    await upsertLead(client as any, 'ASTROLOGER' as any, {
      name: 'Phone Astro',
      phone: '+91 99999 11111',
      source: 'unit-test',
    });
    const second = await upsertLead(client as any, 'ASTROLOGER' as any, {
      name: 'Phone Astro renamed',
      phone: '+919999911111',
      source: 'unit-test',
    });
    expect(second).toBe('skipped');
    expect(client.rows).toHaveLength(1);
  });

  it('rejects malformed email but accepts phone fallback', async () => {
    const client = makeStubClient();
    const r = await upsertLead(client as any, 'WELLNESS_INSTRUCTOR' as any, {
      name: 'Yoga Sam',
      email: 'not-an-email',
      phone: '+91 88888 00000',
      source: 'unit-test',
    });
    expect(r).toBe('created');
    expect(client.rows[0].email).toBeNull();
    expect(client.rows[0].phone).toBe('+918888800000');
  });
});

describe('priests scraper parses HTML via cheerio', () => {
  it('parses a fake okpuja-style listing into upsert calls', async () => {
    const { fetchAndParse, DIRECTORY_URLS } = await import('./scrape-priests.js');
    const okpuja = DIRECTORY_URLS[0];
    const html = `
      <html><body>
        <div class="pandit-card">
          <h3 class="name">Pandit Ramesh</h3>
          <span class="city">Delhi</span>
          <a href="tel:+919876543210" class="phone">+91 98765 43210</a>
          <a href="mailto:ramesh@example.com">email</a>
        </div>
        <div class="pandit-card">
          <h3 class="name">Pandit Suresh</h3>
          <span class="city">Mumbai</span>
          <a href="tel:+919999988888" class="phone">+91 99999 88888</a>
        </div>
      </body></html>
    `;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(html, { status: 200 }),
    );
    const collected: RawLead[] = [];
    await fetchAndParse(
      { ...okpuja, urls: ['https://example.test/listing'] },
      async (raw) => {
        collected.push(raw);
        return 'created';
      },
    );
    fetchSpy.mockRestore();
    expect(collected.length).toBeGreaterThanOrEqual(2);
    expect(collected[0]).toMatchObject({
      name: 'Pandit Ramesh',
      city: 'Delhi',
      source: 'okpuja',
    });
  });
});
