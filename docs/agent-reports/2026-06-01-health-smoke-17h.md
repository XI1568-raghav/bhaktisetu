# Health Smoke — 2026-06-01 17:36:12

> Runs every 6h via GH Actions. Hits public + per-role endpoints on prod.

## Result

- **Pass**: 49
- **Fail**: 39
- **Exit**: 1
- **API**: https://api.darshya.online
- **Web**: https://darshya.online

## Failing endpoints (39)

```
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/users/me/bookings  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/me/reading-progress  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gurukuls/mine/list  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gurukul-portal/applications  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/lessons  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/priest/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/priest/bookings  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/priest/profile  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/priest/pujas  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/store-admin/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/store-admin/products  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/store-admin/revenue  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/astrologer-portal/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/wellness-portal/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/wellness-portal/students  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gaushala-portal/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gaushala-portal/cows  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gaushala-portal/volunteers  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gaushala-portal/donations  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/temple-portal/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/temple-portal/pujas  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/temple-portal/darshan  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/temple-portal/donations  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
```

## Tail

```
  [PASS] WEB   200  /wellness-portal
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/wellness-portal/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/wellness-portal/students  -- {"error":"Unauthorized","message":"Invalid or expired access token."}

=== gaushala ===
  [PASS] LOGIN 200  /api/v1/auth/login
  [PASS] WEB   200  /gaushala-portal
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gaushala-portal/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gaushala-portal/cows  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gaushala-portal/volunteers  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/gaushala-portal/donations  -- {"error":"Unauthorized","message":"Invalid or expired access token."}

=== temple ===
  [PASS] LOGIN 200  /api/v1/auth/login
  [PASS] WEB   200  /temple-portal
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/temple-portal/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/temple-portal/pujas  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/temple-portal/darshan  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/temple-portal/donations  -- {"error":"Unauthorized","message":"Invalid or expired access token."}

=== admin ===
  [PASS] LOGIN 200  /api/v1/auth/login
  [PASS] WEB   200  /admin
  [FAIL] API   401  /api/v1/users/me  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/admin/dashboard  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/admin/temples  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/admin/pending-approvals  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/admin/bookings  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/admin/leads  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/admin/gurukuls/?status=all  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  /api/v1/admin/content-queue  -- {"error":"Unauthorized","message":"Invalid or expired access token."}
  [FAIL] API   401  gurukul-mut: list empty  -- 

=== perms ===
  [PASS] DENY  401  devotee → /admin/gurukuls

Total: 49 pass, 39 fail
```

---
*Agent: health-smoke*
