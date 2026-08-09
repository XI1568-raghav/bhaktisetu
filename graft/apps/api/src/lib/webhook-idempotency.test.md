# apps\api\src\lib\webhook-idempotency.test.ts

- Row · interface · L6-L11 — Defines the shape of an in-memory webhook_replay row used by the mocked prisma layer.
- resetTable · function · L13-L16 — Clears the simulated replay table between tests so cases stay isolated.
- loadFresh · function · L61-L64 — Re-imports the module under test after resetting Vitest's module registry so module-level table-ensured state is fresh for each case.
