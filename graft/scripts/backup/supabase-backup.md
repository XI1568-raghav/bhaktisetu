# scripts\backup\supabase-backup.mjs

- buildPgDumpArgs · function · L44-L55 — function buildPgDumpArgs(databaseUrl, outPath)
- buildBackupKey · function · L61-L67 — function buildBackupKey(date = new Date())
- envGate · function · L69-L75 — function envGate()
- runPgDump · function · L77-L94 — async function runPgDump(databaseUrl, outPath)
- sha256File · function · L96-L104 — async function sha256File(path)
- uploadToSupabaseStorage · function · L111-L137 — async function uploadToSupabaseStorage(localPath, key, sizeBytes)
- pingHeartbeat · function · L139-L151 — async function pingHeartbeat(success, payload)
- runBackup · function · L153-L224 — async function runBackup({ now = new Date() } = {})
