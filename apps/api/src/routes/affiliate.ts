import { FastifyInstance } from 'fastify';

/**
 * Affiliate click tracking + outbound redirect.
 *
 * Pattern: Darshya yatra detail pages link to `/api/v1/affiliate/click?dest=<slug>&partner=<key>`.
 * This route logs the click + 302-redirects to the partner's URL with UTM params.
 *
 * Real partner affiliate IDs go in env vars (AFF_MAKEMYTRIP_ID, AFF_GOIBIBO_ID, AFF_IRCTC_ID).
 * When absent, the click still tracks but the URL has no affiliate ID — clicks won't pay until set.
 *
 * Persistence: today, `server.log.info` only. Future: Prisma `AffiliateClick` table.
 */

const PARTNER_BASE: Record<string, string> = {
  makemytrip: 'https://www.makemytrip.com/holidays-india/',
  goibibo: 'https://www.goibibo.com/holidays/',
  irctc: 'https://www.irctctourism.com/',
};

const PARTNER_AFF_PARAM: Record<string, string> = {
  makemytrip: 'affId',
  goibibo: 'affId',
  irctc: 'utm_source',
};

const PARTNER_ENV_KEY: Record<string, string> = {
  makemytrip: 'AFF_MAKEMYTRIP_ID',
  goibibo: 'AFF_GOIBIBO_ID',
  irctc: 'AFF_IRCTC_ID',
};

function buildUrl(partner: string, dest: string): string | null {
  const base = PARTNER_BASE[partner];
  if (!base) return null;
  const u = new URL(base);
  u.searchParams.set('utm_source', 'darshya');
  u.searchParams.set('utm_medium', 'affiliate');
  u.searchParams.set('utm_campaign', dest);
  const affId = process.env[PARTNER_ENV_KEY[partner]!];
  if (affId) {
    u.searchParams.set(PARTNER_AFF_PARAM[partner]!, affId);
  }
  return u.toString();
}

export async function affiliateRoutes(server: FastifyInstance) {
  server.get<{ Querystring: { dest?: string; partner?: string } }>(
    '/click',
    async (request, reply) => {
      const { dest, partner } = request.query;
      if (!dest || !partner) {
        return reply.code(400).send({ error: 'dest and partner are required' });
      }
      const target = buildUrl(partner, dest);
      if (!target) {
        return reply.code(400).send({ error: `Unknown partner: ${partner}` });
      }
      server.log.info({ event: 'affiliate_click', dest, partner, ip: request.ip }, 'affiliate click');
      return reply.redirect(target, 302);
    },
  );
}
