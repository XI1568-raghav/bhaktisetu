# Resend Free Tier Limits + Outreach Throttling

## Resend free tier (default)

| Limit | Value | Source |
|---|---|---|
| Requests/sec | 2 | Resend free plan |
| Emails/day | 100 | Resend free plan |
| Emails/month | 3,000 | Resend free plan |
| Verified domain | 1 | Free tier |

## Outreach cron throttling

`apps/api/src/jobs/outreach-cron.ts` enforces:

- **Throttle**: 600ms sleep between sends (~1.67/sec, headroom under 2/sec)
- **Daily cap**: 90/day (10 buffer for transactional bookings + 80G receipts which share quota)
- **Persistence**: `resend_daily_counter` raw SQL table tracks daily count; resets at UTC midnight via natural day-key

## Tier upgrade

Once paid Resend Pro (~$20/mo, 50K emails/mo, 10/sec):

```bash
# Render env
RESEND_TIER=pro
```

This lifts:
- Throttle 600ms → 100ms
- Daily cap 90 → 5,000

## Why failures shown earlier

Before this fix, outreach cron sent all 50 first-touch leads + 50×2 follow-ups = up to 150 emails per tick at full speed (no throttle). Each tick blew through Resend's 2/sec rate limit AND 100/day quota. Symptom: HTTP 429 or "daily quota reached" error per send.

Now: caps to 90/day + 600ms throttle = 90 emails over ~54 sec per tick, well within free tier.

## Diagnostics

Daily count check:
```sql
SELECT * FROM resend_daily_counter ORDER BY day DESC LIMIT 7;
```

Recent failures:
```sql
SELECT template_key, status, error, sent_at FROM outreach_logs
WHERE status = 'FAILED' ORDER BY sent_at DESC LIMIT 20;
```

## Failure handling

Failed sends still record `OutreachLog.status='FAILED'`. They're NOT auto-retried — next tick picks fresh leads. To re-send a failed batch, manually clear the FAILED log rows or re-import affected leads as NEW.

## Future

When volume justifies, switch to a transactional ESP that doesn't share quota with marketing:
- Postmark $10/mo for transactional only
- AWS SES $0.10/1K
- Loops $49/mo for marketing automation

Keep Resend for transactional only. Move outreach to dedicated marketing ESP.
