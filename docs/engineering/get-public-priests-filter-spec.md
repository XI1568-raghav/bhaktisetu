# getPublicPriests Server-Side Filter — Specialization + Deity

> **Roadmap item**: R-Q1-E-013 (P2) · **Authored**: 2026-06-13 · **Already partial-shipped**: 2026-05-27 batch

## Goal

Q1 finalize getPublicPriests server-side filter w/ specialization + deity. Replaces client-side filtering (which fails at scale 100+ priests).

## Already shipped (per 2026-05-27 batch HANDOFF)

`apps/api/src/routes/priests-public.ts` — `getPublicPriests({ specialization, deity })` w/ Prisma `has:` on string[] + `some:` on offerings relation.

## Remaining Q1 polish

- Pagination (limit + offset)
- Sort options (price asc/desc, rating, experience)
- City filter (extends existing search)
- Combined filter optimization (compound index)

## Engineering tickets

- R-Q1-E-013a: Pagination
- R-Q1-E-013b: Sort options
- R-Q1-E-013c: City filter
- R-Q1-E-013d: Compound index migration

## Closes

R-Q1-E-013 — spec shipped.
