#!/usr/bin/env node
/**
 * Single-container entrypoint for the Render free tier.
 *
 * WHY THIS EXISTS
 * ---------------
 * Render's free tier grants 750 instance-hours per MONTH per ACCOUNT — not per
 * service. Darshya runs two always-on services (`bhaktisetu` API and
 * `darshya-web`), which is 2 x ~720 = ~1,440 hours in a 30-day month against a
 * 750-hour allowance. That is not a tuning problem: on 2026-08-17 the account
 * hit 750.2/750 and Render suspended BOTH services, and darshya.online served
 * 503 for three days before anyone noticed.
 *
 * docs/free-tier-budgets.md measured the alternative explanation and ruled it
 * out: only three workflows wake production, worth about 23 h/month, which is
 * 3% of a 738-hour deficit. "No amount of cron tuning fixes this."
 *
 * So the fix has to remove a service, not shrink its usage. This process runs
 * the Fastify API and the Next standalone server side by side inside ONE
 * container, behind a host-routing proxy, so a single Render service serves
 * both darshya.online and api.darshya.online. One service is ~720 h/month and
 * fits in 750 with room to spare.
 *
 * WHY A PROXY RATHER THAN NEXT REWRITES
 * -------------------------------------
 * The browser and the mobile app both call https://api.darshya.online directly,
 * and NEXT_PUBLIC_API_URL is baked into the client bundle at build time. Host
 * routing keeps both public hostnames working with ZERO client, CORS, or
 * mobile-app changes — point the api.* DNS record at the same service and
 * nothing else moves. A Next rewrite would only cover same-origin /api paths
 * and would silently break the mobile app, which does not go through Next.
 *
 * MEMORY — the real risk, stated plainly
 * --------------------------------------
 * A free instance has 512 MB. Two Node runtimes plus Prisma share it. Each
 * child is capped below (see HEAP_*), leaving headroom for the proxy and for
 * Prisma's native query engine, which lives OUTSIDE the JS heap and is the
 * usual cause of an OOM that heap caps alone do not prevent. If this container
 * OOMs under real traffic, the honest answer is that $7/month for a second
 * service is cheaper than the engineering time to shave another 80 MB.
 *
 * FAILURE POLICY
 * --------------
 * If either child dies, this process exits non-zero so Render restarts the whole
 * container. A half-alive container that answers the health check while the API
 * is dead is worse than a restart: it is exactly the shape of the August outage,
 * where something looked up and nothing was actually serving.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import process from 'node:process';

const PUBLIC_PORT = Number(process.env.PORT || 10000);
const API_PORT = Number(process.env.INTERNAL_API_PORT || 4101);
const WEB_PORT = Number(process.env.INTERNAL_WEB_PORT || 4102);

// 512 MB total. Prisma's query engine is a native process outside these caps,
// so they are deliberately conservative rather than a tidy 256/256 split.
const HEAP_API = process.env.HEAP_API_MB || '180';
const HEAP_WEB = process.env.HEAP_WEB_MB || '200';

// api.darshya.online -> Fastify. Everything else -> Next.
const API_HOST_RE = /^api\./i;
// Same-origin calls from the browser still have to reach the API.
// `api/v\d+`, not `api/v1`: a future /api/v2 must reach Fastify and get a real
// 404 from the API, not fall through to Next and 404 there for the wrong
// reason. Still bounded — /apiary and /api-guide stay with the web app.
const API_PATH_RE = /^\/(api\/v\d+|health|healthz|ops)(\/|$|\?)/;

/**
 * Decide which upstream a request belongs to. Exported so the routing table is
 * covered by tests rather than trusted by inspection — a misrouted /health
 * would fail Render's health check and take the whole (now single) service
 * down, and with one container there is no second service left to serve
 * anything.
 *
 * Host wins over path: api.darshya.online/anything is always the API, because
 * the mobile app and the browser both address it directly and neither goes
 * through Next.
 */
export function routeToApi(host, url) {
  const h = String(host || '');
  // Strip the port before matching so api.darshya.online:10000 still routes.
  const bare = h.replace(/:\d+$/, '');
  return API_HOST_RE.test(bare) || API_PATH_RE.test(String(url || ''));
}

const children = [];
let shuttingDown = false;

function die(why, code = 1) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`[combined] FATAL: ${why}`);
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
  setTimeout(() => process.exit(code), 500).unref();
}

function start(name, args, port, heapMb, cwd) {
  console.log(`[combined] starting ${name} on :${port} (heap ${heapMb} MB)`);
  const child = spawn(process.execPath, [`--max-old-space-size=${heapMb}`, ...args], {
    cwd,
    stdio: ['ignore', 'inherit', 'inherit'],
    // HOSTNAME, not HOST: Next's standalone server.js binds ONLY to
    // process.env.HOSTNAME when it is set, and Render sets HOSTNAME to the pod
    // name — which is why apps/web/Dockerfile forces 0.0.0.0. Both children
    // bind all interfaces; that is safe because Render only routes to the one
    // published PORT, which is the proxy's. Binding them to 127.0.0.1 instead
    // would re-introduce the exact 502 documented in apps/web/Dockerfile.
    env: { ...process.env, PORT: String(port), HOST: '0.0.0.0', HOSTNAME: '0.0.0.0' },
  });
  child.on('exit', (code, signal) => die(`${name} exited (code=${code} signal=${signal})`, code || 1));
  child.on('error', (err) => die(`${name} failed to spawn: ${err.message}`));
  children.push(child);
  return child;
}

/** Resolve when `port` accepts a TCP connection, or reject after `timeoutMs`. */
function waitForPort(port, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http
        .request({ host: '127.0.0.1', port, path: '/', method: 'HEAD', timeout: 2000 }, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          // Any HTTP-level answer means it is listening; only connection
          // refusal means "not yet".
          if (Date.now() > deadline) reject(new Error(`port ${port} never opened`));
          else setTimeout(attempt, 500);
        })
        .on('timeout', () => {
          req.destroy();
          if (Date.now() > deadline) reject(new Error(`port ${port} timed out`));
          else setTimeout(attempt, 500);
        });
      req.end();
    };
    attempt();
  });
}

function proxy(req, res, port) {
  const upstream = http.request(
    {
      host: '127.0.0.1',
      port,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    }
  );
  upstream.on('error', (err) => {
    console.error(`[combined] upstream :${port} error: ${err.message}`);
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('Bad gateway');
  });
  req.pipe(upstream);
}

/**
 * Apply pending migrations before anything serves.
 *
 * In the two-service layout this is the API's own start script
 * (`prisma migrate deploy && node dist/server.js`, apps/api/package.json and
 * apps/api/Dockerfile). Collapsing to one container must not quietly drop it,
 * or the API boots against a schema it was not built for — so it stays here,
 * ahead of both children, and a failure aborts the boot rather than serving
 * against a stale schema.
 */
function migrate() {
  return new Promise((resolve, reject) => {
    console.log('[combined] prisma migrate deploy');
    const m = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: 'apps/api',
      stdio: ['ignore', 'inherit', 'inherit'],
      env: process.env,
      shell: process.platform === 'win32',
    });
    m.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))
    );
    m.on('error', (err) => reject(new Error(`prisma migrate deploy failed: ${err.message}`)));
  });
}

async function main() {
  if (process.env.SKIP_MIGRATE !== '1') await migrate();

  start('api', ['dist/server.js'], API_PORT, HEAP_API, 'apps/api');
  start('web', ['server.js'], WEB_PORT, HEAP_WEB, 'apps/web');

  await Promise.all([waitForPort(API_PORT), waitForPort(WEB_PORT)]).catch((e) => die(e.message));

  const server = http.createServer((req, res) => {
    proxy(req, res, routeToApi(req.headers.host, req.url) ? API_PORT : WEB_PORT);
  });

  // WebSocket / Upgrade passthrough — Next HMR is dev-only, but IVS and any
  // future live features negotiate through here.
  server.on('upgrade', (req, socket, head) => {
    const port = routeToApi(req.headers.host, req.url) ? API_PORT : WEB_PORT;
    const up = http.request({
      host: '127.0.0.1',
      port,
      path: req.url,
      method: req.method,
      headers: req.headers,
    });
    up.on('upgrade', (upRes, upSocket, upHead) => {
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(upRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n')}\r\n\r\n`
      );
      if (upHead && upHead.length) upSocket.unshift(upHead);
      upSocket.pipe(socket).pipe(upSocket);
    });
    up.on('error', () => socket.destroy());
    if (head && head.length) up.write(head);
    up.end();
  });

  server.listen(PUBLIC_PORT, '0.0.0.0', () => {
    console.log(`[combined] proxy listening on :${PUBLIC_PORT} (api :${API_PORT}, web :${WEB_PORT})`);
  });
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => die(`received ${sig}`, 0));
}

// Only boot when executed directly; importing this module (the routing test
// does) must not spawn children or bind a port.
if (process.argv[1] && process.argv[1].endsWith('render-combined-server.mjs')) {
  main().catch((e) => die(e.message));
}
