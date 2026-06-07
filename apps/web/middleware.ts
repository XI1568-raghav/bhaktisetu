import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP nonce middleware — Next 15 App Router.
 *
 * Generates a fresh base64 nonce per request, injects it into:
 *  1. Response `Content-Security-Policy` header (script-src 'nonce-…')
 *  2. Response + request `x-nonce` header so server components can read it via
 *     `headers().get('x-nonce')` and pass to <Script nonce={nonce}> + inline
 *     <script nonce={nonce} dangerouslySetInnerHTML> JSON-LD blocks.
 *
 * Order-of-precedence: this middleware CSP overrides the static
 * `public/_headers` CSP on every dynamic response. Static assets (images,
 * fonts, _next/static) still receive the _headers CSP from Cloudflare Pages
 * because they bypass the Next.js middleware (see matcher exclusions).
 *
 * style-src retains 'unsafe-inline' — Tailwind compiles class-conditional
 * style attributes that cannot be nonce'd without a global refactor of every
 * `style={{...}}` JSX prop. script-src is the high-value tightening target.
 */
export function middleware(request: NextRequest) {
  // 16 random bytes -> base64 (~22 chars). Edge runtime crypto.
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com https://js.stripe.com https://*.posthog.com https://www.googletagmanager.com https://connect.facebook.net https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://googleads.g.doubleclick.net`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com`,
    `img-src 'self' data: blob: https: *.supabase.co *.r2.cloudflarestorage.com *.googleusercontent.com *.googlesyndication.com *.doubleclick.net`,
    `connect-src 'self' https://api.darshya.online https://*.supabase.co https://*.ingest.sentry.io https://*.sentry.io https://*.posthog.com https://api.stripe.com https://api.razorpay.com https://www.google-analytics.com https://*.facebook.com https://*.doubleclick.net https://*.googlesyndication.com`,
    `frame-src 'self' https://checkout.razorpay.com https://js.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://meet.jit.si https://*.doubleclick.net https://googleads.g.doubleclick.net https://*.googlesyndication.com`,
    `media-src 'self' blob: https:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://checkout.razorpay.com https://api.razorpay.com https://checkout.stripe.com`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  // Pass nonce to React tree via request header (read in layout.tsx via headers()).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|manifest\\.json|robots\\.txt|sitemap\\.xml|feed\\.xml|og/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|css|js)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
