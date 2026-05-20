# Team photos

The `/about` page renders founder avatars from this folder.

Current files are SVG initials placeholders. Replace with real photos:

```
raghav.svg → raghav.jpg  (480×480, square, < 200 KB recommended)
atishey.svg → atishey.jpg
```

After dropping in `*.jpg`, update `apps/web/app/about/page.tsx` `founders[].photo` paths from `.svg` to `.jpg`. That's the only code change needed — `next/image` with `unoptimized` works for both.
