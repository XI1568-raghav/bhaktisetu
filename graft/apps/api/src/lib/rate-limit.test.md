# apps\api\src\lib\rate-limit.test.ts

- UserInjector · interface · L11-L13 — Options bag letting a test impersonate an authenticated user id so the key generator partitions by user rather than IP.
- buildApp · function · L15-L68 — Builds a self-contained Fastify harness that replicates the production rate-limit plugin setup (key derivation, allow-list, /auth prefix override) without bootstrapping the full server.
