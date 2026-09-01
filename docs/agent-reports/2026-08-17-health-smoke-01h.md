# Health Smoke — 2026-08-17 01:06:40

> Runs every 6h via GH Actions. Hits public + per-role endpoints on prod.

## Result

- **Pass**: 32
- **Fail**: 9
- **Exit**: 1
- **API**: https://api.darshya.online
- **Web**: https://darshya.online

## Failing endpoints (9)

```
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] API   401  gurukul-mut: AUTH FAILED (HTTP 401) — real guard bug  -- 
```

## Tail

```
  [PASS] GET   200  /gurukuls
  [PASS] GET   200  /become-gurukul
  [PASS] GET   200  /gurukul-portal
  [PASS] GET   200  /sanskrit
  [PASS] GET   200  /ved
  [PASS] GET   200  /sanatan
  [PASS] GET   200  /learn-sanskrit
  [PASS] GET   200  /about
  [PASS] GET   200  /contact
  [PASS] GET   200  /pricing

=== devotee ===
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token

=== priest ===
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token

=== store ===
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token

=== astrologer ===
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token

=== wellness ===
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token

=== gaushala ===
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token

=== temple ===
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token

=== admin ===
  [FAIL] LOGIN 0    /api/v1/auth/login  -- no token
  [FAIL] API   401  gurukul-mut: AUTH FAILED (HTTP 401) — real guard bug  -- 

=== perms ===
  [PASS] DENY  401  devotee → /admin/gurukuls

Total: 32 pass, 9 fail
```

---
*Agent: health-smoke*
