# UGC Reviews v2 — Photo Upload + Moderation Queue + Verified Badge

> **Roadmap item**: R-Q3-E-014 (P2) · **Authored**: 2026-06-13

## Goal

Q3 ship UGC reviews v2. Photo upload + moderation queue + verified-purchase badge. Targets 500+ reviews Q3-end.

## Schema

```prisma
model Review {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  pujaId      String?  @map("puja_id")
  templeId    String?  @map("temple_id")
  pandit Id    String?  @map("pandit_id")
  bookingId   String?  @map("booking_id")
  rating      Int      // 1-5
  text        String?  @db.Text
  photoUrls   String[] @map("photo_urls")
  verified    Boolean  @default(false)  // Auto-true if bookingId valid
  status      ReviewStatus @default(pending_moderation)
  createdAt   DateTime @default(now())
  user        User @relation(fields: [userId], references: [id])
  @@map("reviews")
}

enum ReviewStatus { pending_moderation approved rejected flagged }
```

## Flow

1. Booking complete + video proof viewed → 24hr after → email prompt "Rate your experience"
2. User submits rating + text + 0-3 photos
3. Auto-moderation: profanity filter + photo CSAM check (Cloudflare Images AI)
4. If flagged → admin review queue
5. If clean → published w/ verified badge (because bookingId valid)
6. Display on /pujas/{slug} + /temples/{slug} + /pandits/{id}

## Engineering tickets

- R-Q3-E-014a: Prisma migration
- R-Q3-E-014b: Submit review form
- R-Q3-E-014c: Photo upload via CF Images
- R-Q3-E-014d: Moderation queue UI
- R-Q3-E-014e: Display on respective pages

## Q3 success

- 500 reviews submitted
- 90%+ auto-approved (low flag rate)
- 4.5+ avg rating

## Closes

R-Q3-E-014 — spec shipped.
