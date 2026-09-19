# Health Smoke — 2026-09-19 15:21:52

> Runs every 12h via GH Actions. Hits public + per-role endpoints on prod.

❌ **UNHEALTHY — this run is RED.** Production did not answer as expected. See `.github/workflows/agents-health.yml`; a `render-suspended`-style issue is filed automatically and this digest is still committed.

## Result

- **Pass**: 0
- **Fail**: 41
- **Child exit**: 1
- **Agent exit**: 1
- **API**: https://api.darshya.online
- **Web**: https://darshya.online

## Failing endpoints (41)

```
  [FAIL] GET   503  /health  -- <!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width
  [FAIL] GET   503  /api/v1/temples  -- <!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width
  [FAIL] GET   503  /api/v1/pujas/types  -- <!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width
  [FAIL] GET   429  /api/v1/gurukuls  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/gurukuls/sampurnanand-sanskrit-vidyalaya  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/knowledge/sanskrit  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/knowledge/ved  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/knowledge/sanatan  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/panchang/today?lat=28.6139&lng=77.2090  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/content  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/priests  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/store/products  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/astrology/horoscope/daily?sign=aries  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/astrology/astrologers  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   429  /api/v1/yatra-packages  -- <!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/htm
  [FAIL] GET   503  /  -- 
  [FAIL] GET   503  /auth/login  -- 
  [FAIL] GET   503  /auth/signup  -- 
  [FAIL] GET   429  /dashboard  -- 
  [FAIL] GET   429  /pujas  -- 
  [FAIL] GET   429  /temples  -- 
  [FAIL] GET   429  /gurukuls  -- 
  [FAIL] GET   429  /become-gurukul  -- 
  [FAIL] GET   429  /gurukul-portal  -- 
  [FAIL] GET   429  /sanskrit  -- 
  [FAIL] GET   429  /ved  -- 
  [FAIL] GET   429  /sanatan  -- 
  [FAIL] GET   429  /learn-sanskrit  -- 
  [FAIL] GET   429  /about  -- 
  [FAIL] GET   429  /contact  -- 
```

## Tail

```
  [FAIL] GET   429  /gurukuls  -- 
  [FAIL] GET   429  /become-gurukul  -- 
  [FAIL] GET   429  /gurukul-portal  -- 
  [FAIL] GET   429  /sanskrit  -- 
  [FAIL] GET   429  /ved  -- 
  [FAIL] GET   429  /sanatan  -- 
  [FAIL] GET   429  /learn-sanskrit  -- 
  [FAIL] GET   429  /about  -- 
  [FAIL] GET   429  /contact  -- 
  [FAIL] GET   429  /pricing  -- 

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
  [FAIL] API   429  gurukul-mut: 200 but no gurukul rows seeded in prod — data, not auth  -- 

=== perms ===
  [FAIL] DENY  429  devotee → /admin/gurukuls  -- SHOULD BE BLOCKED

Total: 0 pass, 41 fail
```

---
*Agent: health-smoke*
