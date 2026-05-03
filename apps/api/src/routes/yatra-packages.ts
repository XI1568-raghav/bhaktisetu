import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

/**
 * Layer AU — owned yatra packages. Vertical-integrated tours bookable directly
 * (vs M1 affiliate redirects to MMT/Goibibo/IRCTC). Higher margin (20-30%).
 *
 * Tables (raw SQL on first call — no Prisma migration this layer):
 *   yatra_packages: id, slug, name, destination_slug, duration_days,
 *     price_inr, price_usd, max_group_size, current_group_size, includes_text,
 *     excludes_text, itinerary, departure_dates, is_active, created_at
 *   yatra_bookings: id, package_id, user_id, travelers_count, contact_email,
 *     contact_phone, special_requests, total_inr, status, created_at
 */

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS yatra_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      destination_slug TEXT NOT NULL,
      duration_days INT NOT NULL,
      price_inr NUMERIC(10,2) NOT NULL,
      price_usd NUMERIC(10,2),
      max_group_size INT NOT NULL DEFAULT 30,
      current_group_size INT NOT NULL DEFAULT 0,
      includes_text JSONB DEFAULT '[]'::jsonb,
      excludes_text JSONB DEFAULT '[]'::jsonb,
      itinerary JSONB DEFAULT '{}'::jsonb,
      departure_dates JSONB DEFAULT '[]'::jsonb,
      hero_image TEXT,
      short_description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS yatra_bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_number TEXT UNIQUE NOT NULL,
      package_id UUID NOT NULL,
      user_id UUID,
      travelers_count INT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      special_requests TEXT,
      total_inr NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      razorpay_order_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS yatra_packages_destination_idx ON yatra_packages (destination_slug);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS yatra_bookings_package_idx ON yatra_bookings (package_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS yatra_bookings_user_idx ON yatra_bookings (user_id);`);
}

const bookSchema = z.object({
  travelersCount: z.number().int().min(1).max(20),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10).max(15),
  specialRequests: z.string().max(500).optional(),
});

function bookingNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `YT-${ymd}-${rand}`;
}

export async function yatraPackagesRoutes(server: FastifyInstance) {
  await ensureTables().catch((err) => server.log.warn({ err }, 'yatra_packages tables init failed'));

  server.get<{ Querystring: { destination?: string; maxPrice?: string } }>(
    '/',
    async (request) => {
      const { destination, maxPrice } = request.query;
      const conditions: string[] = ['is_active = true'];
      const params: unknown[] = [];
      if (destination) {
        params.push(destination);
        conditions.push(`destination_slug = $${params.length}`);
      }
      if (maxPrice) {
        params.push(Number(maxPrice));
        conditions.push(`price_inr <= $${params.length}`);
      }
      const sql = `SELECT id, slug, name, destination_slug, duration_days, price_inr, price_usd,
        max_group_size, current_group_size, hero_image, short_description, departure_dates
        FROM yatra_packages WHERE ${conditions.join(' AND ')} ORDER BY price_inr ASC`;
      try {
        const rows = await prisma.$queryRawUnsafe<unknown[]>(sql, ...params);
        return { packages: rows };
      } catch (err) {
        server.log.warn({ err }, 'yatra-packages list failed');
        return { packages: [] };
      }
    },
  );

  server.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const { slug } = request.params;
    try {
      const rows = await prisma.$queryRawUnsafe<unknown[]>(
        `SELECT * FROM yatra_packages WHERE slug = $1 AND is_active = true LIMIT 1`,
        slug,
      );
      if (rows.length === 0) return reply.code(404).send({ error: 'Package not found' });
      return rows[0];
    } catch (err) {
      server.log.warn({ err }, 'yatra-package detail failed');
      return reply.code(404).send({ error: 'Package not found' });
    }
  });

  server.post<{ Params: { slug: string }; Body: unknown }>(
    '/:slug/book',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const { slug } = request.params;
      const parsed = bookSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const pkg = await prisma.$queryRawUnsafe<{ id: string; price_inr: string; max_group_size: number; current_group_size: number }[]>(
        `SELECT id, price_inr, max_group_size, current_group_size FROM yatra_packages WHERE slug = $1 AND is_active = true LIMIT 1`,
        slug,
      );
      if (pkg.length === 0) return reply.code(404).send({ error: 'Package not found' });
      const p = pkg[0]!;
      if (p.current_group_size + parsed.data.travelersCount > p.max_group_size) {
        return reply.code(409).send({ error: 'Group is full' });
      }
      const totalInr = Number(p.price_inr) * parsed.data.travelersCount;
      const num = bookingNumber();
      await prisma.$executeRawUnsafe(
        `INSERT INTO yatra_bookings (booking_number, package_id, user_id, travelers_count, contact_email, contact_phone, special_requests, total_inr)
         VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)`,
        num, p.id, request.currentUser!.id, parsed.data.travelersCount,
        parsed.data.contactEmail, parsed.data.contactPhone, parsed.data.specialRequests ?? null, totalInr,
      );
      await prisma.$executeRawUnsafe(
        `UPDATE yatra_packages SET current_group_size = current_group_size + $1 WHERE id = $2::uuid`,
        parsed.data.travelersCount, p.id,
      );
      server.log.info({ bookingNumber: num, slug, userId: request.currentUser!.id }, 'yatra booking created');
      return { bookingNumber: num, totalInr, status: 'pending_payment' };
    },
  );
}
