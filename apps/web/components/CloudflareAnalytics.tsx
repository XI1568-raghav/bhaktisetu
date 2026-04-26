/**
 * Cloudflare Web Analytics — privacy-first, free, included with Cloudflare
 * Pages. Active when NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN is set.
 *
 * Get the token: Cloudflare dashboard → Analytics & Logs → Web Analytics →
 * Add a site → copy the JS beacon token from the snippet.
 */
export function CloudflareAnalytics() {
  const token = process.env.NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN;
  if (!token) return null;

  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
