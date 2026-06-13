# Image CDN Optimization — Cloudflare Images + AVIF + Lazy Load

> **Roadmap item**: R-Q3-E-012 (P1) · **Authored**: 2026-06-13

## Goal

Q3 LCP optimization. Cloudflare Images CDN + AVIF + lazy-load. Targets LCP <2.5sec p75.

## Cloudflare Images

- Enable CF Images on poojly-web project ($5/mo + $1 per 1K images)
- Auto-convert source → AVIF/WebP per Accept header
- Resize on-the-fly via URL params

## next/image migration

- Replace all `<img>` w/ `<Image>` from next/image
- Set `width` + `height` (prevent CLS)
- Use `priority` for above-fold hero images
- Default lazy-load for below-fold

## CF Image loader

`next.config.ts`:
```typescript
images: {
  loader: 'custom',
  loaderFile: './lib/cf-image-loader.ts'
}
```

```typescript
// lib/cf-image-loader.ts
export default function loader({ src, width, quality }) {
  return `https://imagedelivery.net/${ACCOUNT_HASH}/${src}/w=${width},q=${quality||75},f=auto`
}
```

## Migration plan

- Phase 1: hero images (8 home strips)
- Phase 2: card images (300+ across /pujas /temples /deity /tirth)
- Phase 3: blog + pillar pages

## Engineering tickets

- R-Q3-E-012a: CF Images setup
- R-Q3-E-012b: next/image migration phase 1-3
- R-Q3-E-012c: Lighthouse LCP verify
- R-Q3-E-012d: Cost monitor (stay <$10/mo Q3)

## Q3 success

- LCP <2.5sec p75 across home + pujas + temples
- 40% bandwidth savings via AVIF
- 90+ Lighthouse perf score

## Closes

R-Q3-E-012 — spec shipped.
