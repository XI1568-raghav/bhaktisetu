# Health Smoke — 2026-05-27 02:32:55

> Runs every 6h via GH Actions. Hits public + per-role endpoints on prod.

## Result

- **Pass**: 89
- **Fail**: 0
- **Exit**: 0
- **API**: https://api.darshya.online
- **Web**: https://darshya.online

✓ All clear.

## Tail

```
  [PASS] API   200  /api/v1/users/me
  [PASS] API   200  /api/v1/wellness-portal/dashboard
  [PASS] API   200  /api/v1/wellness-portal/students

=== gaushala ===
  [PASS] LOGIN 200  /api/v1/auth/login
  [PASS] WEB   200  /gaushala-portal
  [PASS] API   200  /api/v1/users/me
  [PASS] API   200  /api/v1/gaushala-portal/dashboard
  [PASS] API   200  /api/v1/gaushala-portal/cows
  [PASS] API   200  /api/v1/gaushala-portal/volunteers
  [PASS] API   200  /api/v1/gaushala-portal/donations

=== temple ===
  [PASS] LOGIN 200  /api/v1/auth/login
  [PASS] WEB   200  /temple-portal
  [PASS] API   200  /api/v1/users/me
  [PASS] API   200  /api/v1/temple-portal/dashboard
  [PASS] API   200  /api/v1/temple-portal/pujas
  [PASS] API   200  /api/v1/temple-portal/darshan
  [PASS] API   200  /api/v1/temple-portal/donations

=== admin ===
  [PASS] LOGIN 200  /api/v1/auth/login
  [PASS] WEB   200  /admin
  [PASS] API   200  /api/v1/users/me
  [PASS] API   200  /api/v1/admin/dashboard
  [PASS] API   200  /api/v1/admin/temples
  [PASS] API   200  /api/v1/admin/pending-approvals
  [PASS] API   200  /api/v1/admin/bookings
  [PASS] API   200  /api/v1/admin/leads
  [PASS] API   200  /api/v1/admin/gurukuls/?status=all
  [PASS] API   200  /api/v1/admin/content-queue
  [PASS] PATCH 200  verify toggle
  [PASS] PATCH 200  verify restore

=== perms ===
  [PASS] DENY  403  devotee → /admin/gurukuls

Total: 89 pass, 0 fail
```

---
*Agent: health-smoke*
