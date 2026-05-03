// AdSense crawls /ads.txt to confirm the publisher ID is authorised to sell
// inventory on this domain. Required for AdSense approval. The publisher ID
// (pub-XXXX) is the numeric portion of NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-XXXX).

export const runtime = 'edge';
export const dynamic = 'force-static';

export function GET(): Response {
 const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '';
 const pubId = client.replace(/^ca-/, '').trim();
 if (!pubId) {
  // No publisher configured yet — return an empty file rather than a 404 so
  // crawlers see a deliberate response and don't retry-storm the origin.
  return new Response('# ads.txt — publisher not yet configured\n', {
   status: 200,
   headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
 }
 const body = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
 return new Response(body, {
  status: 200,
  headers: {
   'content-type': 'text/plain; charset=utf-8',
   'cache-control': 'public, max-age=86400',
  },
 });
}
