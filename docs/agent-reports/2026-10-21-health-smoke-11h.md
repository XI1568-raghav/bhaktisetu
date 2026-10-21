# Health Smoke — 2026-10-21 11:17:55

> Runs every 12h via GH Actions. Hits public + per-role endpoints on prod.

❌ **UNHEALTHY — this run is RED.** Production did not answer as expected. See `.github/workflows/agents-health.yml`; a `render-suspended`-style issue is filed automatically and this digest is still committed.

## Result

- **Pass**: 29
- **Fail**: 12
- **Child exit**: 1
- **Agent exit**: 1
- **API**: https://api.darshya.online
- **Web**: https://darshya.online

## Failing endpoints (12)

```
  [FAIL] GET   503  /learn-sanskrit  -- 
  [FAIL] GET   503  /about  -- 
  [FAIL] GET   503  /pricing  -- 
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
  [FAIL] GET   503  /learn-sanskrit  -- 
  [FAIL] GET   503  /about  -- 
  [PASS] GET   200  /contact
  [FAIL] GET   503  /pricing  -- 

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

Total: 29 pass, 12 fail
```

---
*Agent: health-smoke*
