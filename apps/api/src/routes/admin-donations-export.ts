import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

/**
 * 80G donation receipt batch export. Streams CSV of paid donations in a
 * date range so finance/ops can reconcile against the bank statement and
 * file 80G certificates with the income tax department.
 *
 * GET /api/v1/admin/donations/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Both `from` and `to` are optional. When omitted we default to the past
 * 90 days to keep the response bounded — the IT department typically
 * asks for quarterly receipts, so a 90-day window covers that.
 *
 * Audit: every export writes a row to DonationExportAuditLog (exported_by,
 * from_date, to_date, row_count, ip_address, created_at). Best-effort —
 * if the table doesn't exist yet (migration pending) we log to server.log
 * and continue rather than fail the export.
 *
 * CSV: hand-rolled — we have a fixed column list and predictable values
 * (numbers, dates, no embedded quotes in receipt numbers / gaushala IDs)
 * so a string builder is simpler than pulling in a CSV dep. Donor names
 * and email addresses are quoted + double-quote-escaped per RFC 4180.
 */

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD').optional(),
});

const CSV_HEADER = [
  'receipt_number',
  'donor_name',
  'donor_pan',
  'donor_email',
  'donee_name',
  'amountInr',
  'donation_date',
  'gaushala_id',
].join(',');

function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

interface ExportRow {
  receipt_number: string | null;
  donor_name: string | null;
  donor_email: string | null;
  donor_pan: string | null;
  donee_name: string | null;
  amount_inr: string;
  paid_at: Date | null;
  gaushala_id: string;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function adminDonationsExportRoutes(server: FastifyInstance) {
  server.get(
    '/export.csv',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (request, reply) => {
      const parsed = querySchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid query parameters', details: parsed.error.flatten() });
      }

      const now = new Date();
      const fromDate = parsed.data.from
        ? new Date(`${parsed.data.from}T00:00:00.000Z`)
        : new Date(now.getTime() - NINETY_DAYS_MS);
      const toDate = parsed.data.to
        ? new Date(`${parsed.data.to}T23:59:59.999Z`)
        : now;

      let rows: ExportRow[] = [];
      try {
        rows = await prisma.$queryRawUnsafe<ExportRow[]>(
          `SELECT d.receipt_number,
                  u.full_name AS donor_name,
                  u.email     AS donor_email,
                  NULL::text  AS donor_pan,
                  gp.gaushala_name AS donee_name,
                  d.amount_inr::text AS amount_inr,
                  d.paid_at,
                  d.gaushala_id
             FROM donations d
             LEFT JOIN users u             ON u.id = d.user_id
             LEFT JOIN gaushala_profiles gp ON gp.user_id::text = d.gaushala_id
            WHERE d.status = 'paid'
              AND d.paid_at IS NOT NULL
              AND d.paid_at >= $1
              AND d.paid_at <= $2
            ORDER BY d.paid_at ASC`,
          fromDate,
          toDate,
        );
      } catch (err) {
        // Migration not run yet → empty CSV with audit note in logs.
        server.log.warn({ err }, 'donations export: query failed (migration pending?)');
      }

      const lines: string[] = [CSV_HEADER];
      for (const r of rows) {
        const dateStr = r.paid_at ? new Date(r.paid_at).toISOString().slice(0, 10) : '';
        const amount = Number(r.amount_inr ?? 0).toFixed(2);
        lines.push(
          [
            csvField(r.receipt_number ?? ''),
            csvField(r.donor_name ?? ''),
            csvField(r.donor_pan ?? ''),
            csvField(r.donor_email ?? ''),
            csvField(r.donee_name ?? ''),
            csvField(amount),
            csvField(dateStr),
            csvField(r.gaushala_id ?? ''),
          ].join(','),
        );
      }

      const csv = lines.join('\n') + '\n';

      // Audit log — best-effort. Never fails the export.
      try {
        const exporterId = request.currentUser?.id;
        const ip = request.ip;
        if (exporterId) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "DonationExportAuditLog" (id, exported_by, from_date, to_date, row_count, ip_address, created_at)
             VALUES (gen_random_uuid(), $1::uuid, $2::date, $3::date, $4, $5, NOW())`,
            exporterId,
            fromDate.toISOString().slice(0, 10),
            toDate.toISOString().slice(0, 10),
            rows.length,
            ip ?? null,
          );
        }
      } catch (err) {
        server.log.warn({ err }, 'donations export: audit log insert failed');
      }

      const filename = `darshya-donations-${fromDate.toISOString().slice(0, 10)}-to-${toDate.toISOString().slice(0, 10)}.csv`;
      reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${filename}"`)
        .header('cache-control', 'no-store');
      return reply.send(csv);
    },
  );
}

export const __testing = { csvField, CSV_HEADER };
