-- darshan-channels-2026-10.sql
--
-- Points each temple's darshan stream at its OFFICIAL YouTube channel instead of
-- a per-video id or the dead `stream.darshya.online/...` HLS placeholder seeded
-- by prisma/seed.ts. A pinned video id of a past live stream goes dark; the
-- channel live embed does not, and the web player falls back to the channel's
-- newest upload (RSS) when nothing is broadcasting.
--
-- Scope and safety
--   * Data only. live_darshan_streams already has youtube_channel_id,
--     stream_provider and attribution (baseline/0_init.sql:497), so there is no
--     DDL and no migration. NOT executed by this change: review, then run by hand
--     against the DIRECT_URL database (deploys do not run SQL).
--   * Step 1 updates existing rows for the listed temple slugs; step 2 inserts a
--     row only for a listed temple that has none. Slugs absent from `temples` are
--     skipped silently (the joins are inner). Re-running changes 0 rows.
--   * Does NOT touch temples.live_darshan_enabled, status or viewer counts.
--   * Clears youtube_video_id (a pinned video id is exactly what goes stale).
--   * NOT included, deliberately (no official channel confirmed): Mahakaleshwar
--     (the existing channel "Mahakaleshwar Jyotirlinga Live Darshan" is not
--     confirmed as the Mandir Samiti's), Dwarkadhish, Baidyanath Dham,
--     Ramanathaswamy, Govind Dev Ji, Meenakshi, and the remaining seeded temples.
--
-- Channel provenance (checked 2026-10-18 against youtube.com/feeds/videos.xml,
-- 200 + uploads dated 2026-10-03 or later):
--   A  channel linked from the temple's own official website
--   B  channel title names the temple trust/authority (official-by-name); the
--      official website did not expose the link, so confirm once before relying
--      on it:  somnath-gujarat, tirumala-tirupati (SVBC TTD), kashi-vishwanath-varanasi,
--      jagannath-puri
--
-- Verify after: see the SELECT at the bottom (every listed slug has the channel).

BEGIN;

CREATE TEMP TABLE _darshan_channels (slug text, channel_id text, label text, provenance text) ON COMMIT DROP;
INSERT INTO _darshan_channels (slug, channel_id, label, provenance) VALUES
  ('golden-temple-amritsar',      'UCYn6UEtQ771a_OWSiNBoG8w', 'SGPC, Sri Amritsar',                           'A sgpc.net'),
  ('shirdi-sai-baba',             'UCKGvJDh7g_Kzocbwy7aKicA', 'Shree Saibaba Sansthan Trust',                 'A sai.org.in'),
  ('siddhivinayak-mumbai',        'UCF9FdiMBENIbM6jb44zWmCQ', 'Shree Siddhivinayak Ganapati Temple Trust',    'A siddhivinayak.org'),
  ('vaishno-devi-katra',          'UCFYQr1l7ereS27SrLJ8bBtw', 'Shri Mata Vaishno Devi Shrine Board',          'A maavaishnodevi.org'),
  ('dagdusheth-pune',             'UCFUYpQptYcTT_IKWf2GlESg', 'Shrimant Dagdusheth Halwai Ganpati Trust',     'A dagdushethganpati.com'),
  ('iskcon-bangalore',            'UCPXnayBvF7ynbG_I3VOTgIg', 'ISKCON Bangalore',                             'A iskconbangalore.org'),
  ('somnath-gujarat',             'UCT1egsvA08YcdMLiEu1DTRg', 'Somnath Temple - Official Channel',            'B'),
  ('tirumala-tirupati',           'UCS2Y83GD-fc7qqgNW5uj41g', 'SVBC TTD',                                     'B'),
  ('kashi-vishwanath-varanasi',   'UCdMj2twWfMHXrWgX5oVdoyA', 'Shree Kashi Vishwanath Mandir Trust',          'B'),
  ('jagannath-puri',              'UCstacpPsNLSiGcYe7qbF14Q', 'Shree Jagannatha Temple Administration, Puri', 'B');

-- 1. Existing stream rows.
UPDATE live_darshan_streams s
SET youtube_channel_id = c.channel_id,
    youtube_video_id   = NULL,
    playback_url       = 'https://www.youtube.com/embed/live_stream?channel=' || c.channel_id || '&autoplay=1',
    attribution        = c.label,
    updated_at         = now()
FROM _darshan_channels c
JOIN temples t ON t.slug = c.slug
WHERE s.temple_id = t.id
  AND (   s.youtube_channel_id IS DISTINCT FROM c.channel_id
       OR s.youtube_video_id   IS NOT NULL
       OR s.playback_url       IS DISTINCT FROM 'https://www.youtube.com/embed/live_stream?channel=' || c.channel_id || '&autoplay=1'
       OR s.attribution        IS DISTINCT FROM c.label);

-- 2. Listed temples with no stream row at all.
INSERT INTO live_darshan_streams
  (id, temple_id, stream_key, playback_url, status, stream_provider, youtube_channel_id, attribution, updated_at)
SELECT gen_random_uuid(), t.id, 'stream_' || c.slug,
       'https://www.youtube.com/embed/live_stream?channel=' || c.channel_id || '&autoplay=1',
       'offline', 'YOUTUBE', c.channel_id, c.label, now()
FROM _darshan_channels c
JOIN temples t ON t.slug = c.slug
WHERE NOT EXISTS (SELECT 1 FROM live_darshan_streams s WHERE s.temple_id = t.id);

-- Review before COMMIT: expect one row per listed slug that exists in `temples`.
SELECT t.slug, t.live_darshan_enabled, s.youtube_channel_id, s.playback_url
FROM _darshan_channels c
JOIN temples t ON t.slug = c.slug
LEFT JOIN live_darshan_streams s ON s.temple_id = t.id
ORDER BY t.slug;

COMMIT;
