# scripts\backup\prune-old-backups.mjs

- pickOldBackups · function · L28-L39 — function pickOldBackups(list, now, retentionDays = DEFAULT_RETENTION_DAYS)
- envGate · function · L41-L47 — function envGate()
- listAllBackups · function · L54-L106 — async function listAllBackups(supabaseUrl, bucket, serviceKey)
- listPath · function · L56-L77 — async function listPath(path)
- deleteObjects · function · L108-L126 — async function deleteObjects(supabaseUrl, bucket, serviceKey, paths)
- runPrune · function · L128-L174 — async function runPrune({ now = new Date(), retentionDays = DEFAULT_RETENTION_DAYS } = {})
