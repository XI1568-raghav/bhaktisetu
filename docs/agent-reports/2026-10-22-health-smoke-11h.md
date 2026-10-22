# Health Smoke — 2026-10-22 11:16:58

> Runs every 12h via GH Actions. Hits public + per-role endpoints on prod.

❌ **UNHEALTHY — this run is RED.** Production did not answer as expected. See `.github/workflows/agents-health.yml`; a `render-suspended`-style issue is filed automatically and this digest is still committed.

## Result

- **Pass**: 31
- **Fail**: 10
- **Child exit**: 1
- **Agent exit**: 1
- **API**: https://api.darshya.online
- **Web**: https://darshya.online

## Failing endpoints (10)

```
  [FAIL] GET   503  /ved  -- 
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
  [FAIL] GET   503  /ved  -- 
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

Total: 31 pass, 10 fail
```

---
*Agent: health-smoke*
