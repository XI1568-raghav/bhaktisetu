# Image Optimization Sweep — next/image Migration + CF Image Resizing

> **Roadmap item**: R-Q2-E-008 (P1) · **Authored**: 2026-06-13

## Goal

Audit + migrate all <img> tags to next/image. Enable CF Pages Image Resizing for runtime-optimized variants. Page weight reduction 40-60%, p95 page-load -200ms.

## Audit

```bash
# Find non-next/image usages
grep -rn "<img\s" apps/web/ --include="*.tsx" | head -30

# Common offenders (suspected):
# - Hero banner images on landing pages
# - Temple photos in /temples
# - Pandit profile photos
# - Festival images
# - Blog post images
```

## Migration pattern

```typescript
// Before
<img src="/images/temple.jpg" alt="..." width="800" height="600" />

// After (next/image)
import Image from 'next/image';
<Image src="/images/temple.jpg" alt="..." width={800} height={600}
  sizes="(max-width: 768px) 100vw, 800px"
  quality={80}
/>
```

## CF Pages Image Resizing

Enable in CF Pages dashboard. Free tier: 5K requests/mo. Allows runtime serving:
- `https://darshya.online/cdn-cgi/image/width=400,quality=75/images/temple.jpg`
- Auto WebP/AVIF format for modern browsers
- LCP optimization

## CDN cache

- Set `Cache-Control: public, max-age=31536000, immutable` for /images/* + /assets/*
- Use content-hash filenames for cache busting

## Pass criteria

- [ ] All <img> → <Image> migrated (zero raw <img> in apps/web)
- [ ] Lighthouse Performance score >85 mobile, >95 desktop
- [ ] LCP <2.5s on /temples
- [ ] Total page weight < 1MB for top-3 hot pages

## Engineering tickets

- R-Q2-E-008a: <img> audit + bulk migration codemod
- R-Q2-E-008b: CF Image Resizing enable + URL helper
- R-Q2-E-008c: Cache headers + content-hashing
- R-Q2-E-008d: Lighthouse CI integration

## Closes

R-Q2-E-008 — spec shipped.
