// Reddit OAuth + submit client.
//
// Uses Reddit's "script" OAuth flow (password grant). We only do this from a
// trusted server, never from a browser. Free, no quota beyond the standard
// 60 req/min/account ceiling Reddit applies to all OAuth clients.
//
// Required env (any missing → submitPost returns {skipped:true}, never throws):
//   REDDIT_CLIENT_ID
//   REDDIT_CLIENT_SECRET
//   REDDIT_USERNAME
//   REDDIT_PASSWORD
//   REDDIT_USER_AGENT (optional, defaults to "darshya-content-bot/1.0 by /u/<user>")
//
// All Reddit ToS responsibility lives one layer up — this lib does no
// rate-limiting, no subreddit allowlist enforcement, no de-dupe. Caller does.

const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const SUBMIT_URL = 'https://oauth.reddit.com/api/submit';

interface RedditConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
}

function readConfig(): RedditConfig | null {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;
  if (!clientId || !clientSecret || !username || !password) return null;
  const userAgent =
    process.env.REDDIT_USER_AGENT ?? `darshya-content-bot/1.0 by /u/${username}`;
  return { clientId, clientSecret, username, password, userAgent };
}

export function isRedditConfigured(): boolean {
  return readConfig() !== null;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;

async function getAccessToken(cfg: RedditConfig): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'password',
    username: cfg.username,
    password: cfg.password,
  });
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': cfg.userAgent,
      },
      body,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[reddit] token fetch network error', err);
    return null;
  }
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.warn('[reddit] token request failed', res.status, await safeText(res));
    return null;
  }
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) return null;
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '';
  }
}

export interface SubmitPostInput {
  subreddit: string; // "r/hinduism" or "hinduism"
  title: string;
  text: string; // self-post body (markdown OK)
  flairText?: string;
}

export interface SubmitPostResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  url?: string;
  id?: string;
}

function normaliseSub(sub: string): string {
  return sub.replace(/^\/?r\//i, '').trim();
}

export async function submitRedditPost(input: SubmitPostInput): Promise<SubmitPostResult> {
  const cfg = readConfig();
  if (!cfg) return { ok: false, skipped: true, reason: 'reddit env not configured' };

  const sub = normaliseSub(input.subreddit);
  if (!sub) return { ok: false, skipped: true, reason: 'invalid subreddit' };

  const token = await getAccessToken(cfg);
  if (!token) return { ok: false, skipped: true, reason: 'token fetch failed' };

  const params = new URLSearchParams({
    sr: sub,
    kind: 'self',
    title: input.title.slice(0, 300),
    text: input.text,
    api_type: 'json',
    sendreplies: 'true',
    resubmit: 'false',
  });
  if (input.flairText) params.set('flair_text', input.flairText.slice(0, 64));

  let res: Response;
  try {
    res = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': cfg.userAgent,
      },
      body: params,
    });
  } catch (err) {
    return {
      ok: false,
      reason: `network: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!res.ok) {
    return { ok: false, reason: `http ${res.status}: ${await safeText(res)}` };
  }
  const json = (await res.json().catch(() => ({}))) as {
    json?: {
      errors?: Array<[string, string]>;
      data?: { url?: string; id?: string; name?: string };
    };
  };
  const errors = json.json?.errors ?? [];
  if (errors.length > 0) {
    const flat = errors.map((e) => e.join(':')).join('; ');
    return { ok: false, reason: `reddit: ${flat}` };
  }
  const data = json.json?.data;
  if (!data?.url) return { ok: false, reason: 'no url in response' };
  return { ok: true, url: data.url, id: data.name ?? data.id };
}

// Reset token cache (test hook).
export function __resetRedditTokenCache(): void {
  cachedToken = null;
}
