-- Enable pgvector and add embedding columns for semantic search.
-- Run this against Supabase before backfilling vectors via the
-- scripts/backfill-embeddings.ts script.
--
-- 1024 dims matches Cohere embed-multilingual-v3.0. If switching models,
-- change all three columns + reindex.

create extension if not exists vector;

alter table content_items add column if not exists embedding vector(1024);
alter table temples       add column if not exists embedding vector(1024);
alter table puja_types    add column if not exists embedding vector(1024);

-- IVFFlat indexes for cosine similarity. `lists` should be ~sqrt(rows);
-- 100 is fine up to 100k rows. Re-tune when content scales.
create index if not exists content_items_embedding_idx
  on content_items using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists temples_embedding_idx
  on temples using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists puja_types_embedding_idx
  on puja_types using ivfflat (embedding vector_cosine_ops) with (lists = 100);
