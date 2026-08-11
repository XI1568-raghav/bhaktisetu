# apps\api\src\lib\cache.ts

- getClient · function · L16-L45 — Lazily creates a singleton Redis client tuned to never block request paths, and permanently latches caching off after the first connection error to avoid log floods and repeated failures.
- cacheGet · function · L50-L60 — Reads and JSON-parses a cached value, returning null on miss or any error so callers transparently fall back to the database.
- cacheSet · function · L67-L75 — Writes a JSON-serialized value with a TTL while swallowing all errors so a cache write can never affect the request outcome.
- cached · function · L80-L93 — Read-through cache helper that returns the cached value on a hit, otherwise invokes the loader and caches only non-null results to keep miss semantics simple.
- cacheDel · function · L98-L106 — Deletes a single cache key (typically after a mutation), ignoring errors and no-op mode.
- cacheDelPattern · function · L112-L123 — Invalidates all keys matching a pattern using batched SCAN instead of KEYS so deletion stays safe on large keyspaces.
