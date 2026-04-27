/**
 * Verify the inbound-mail DNS for darshya.online (or any domain passed
 * as argv[2]). Pure DNS lookups, no auth. Prints green/red per check.
 *
 *   pnpm --filter @poojly/api tsx scripts/verify-mail-dns.ts
 *   pnpm --filter @poojly/api tsx scripts/verify-mail-dns.ts example.com
 *
 * Exit code 0 if all required records are present, non-zero otherwise.
 * Suitable for a CI step or a dev pre-launch checklist.
 */

import { promises as dns } from 'node:dns';

const domain = process.argv[2] ?? 'darshya.online';

type CheckResult = { name: string; ok: boolean; detail: string };

async function checkMx(): Promise<CheckResult> {
  try {
    const records = await dns.resolveMx(domain);
    if (records.length === 0) {
      return { name: 'MX present', ok: false, detail: 'no MX records found' };
    }
    const summary = records
      .sort((a, b) => a.priority - b.priority)
      .map((r) => `${r.priority} ${r.exchange}`)
      .join(', ');
    return { name: 'MX present', ok: true, detail: summary };
  } catch (err) {
    return { name: 'MX present', ok: false, detail: (err as Error).message };
  }
}

async function checkSpf(): Promise<CheckResult> {
  try {
    const txts = await dns.resolveTxt(domain);
    const flat = txts.map((t) => t.join(''));
    const spf = flat.find((t) => /^v=spf1/i.test(t));
    if (!spf) return { name: 'SPF (v=spf1 ...)', ok: false, detail: 'no SPF TXT record' };
    return { name: 'SPF (v=spf1 ...)', ok: true, detail: spf };
  } catch (err) {
    return { name: 'SPF (v=spf1 ...)', ok: false, detail: (err as Error).message };
  }
}

async function checkDmarc(): Promise<CheckResult> {
  try {
    const txts = await dns.resolveTxt(`_dmarc.${domain}`);
    const flat = txts.map((t) => t.join(''));
    const dmarc = flat.find((t) => /^v=DMARC1/i.test(t));
    if (!dmarc) return { name: 'DMARC (optional)', ok: false, detail: 'no _dmarc TXT (optional but recommended)' };
    return { name: 'DMARC (optional)', ok: true, detail: dmarc };
  } catch {
    return { name: 'DMARC (optional)', ok: false, detail: 'no _dmarc record (optional)' };
  }
}

async function main() {
  console.log(`Checking inbound-mail DNS for ${domain}\n`);

  const checks = await Promise.all([checkMx(), checkSpf(), checkDmarc()]);
  for (const c of checks) {
    const tag = c.ok ? 'OK ' : 'XX ';
    console.log(`${tag} ${c.name.padEnd(20)} ${c.detail}`);
  }

  const requiredFailed = checks.slice(0, 2).some((c) => !c.ok);
  if (requiredFailed) {
    console.log('\nResult: NOT ready — fix MX and/or SPF first (see docs/support-email-setup.md).');
    process.exit(1);
  }
  console.log('\nResult: inbound mail DNS looks ready. Send a test message to verify end-to-end.');
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
