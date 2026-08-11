# apps\api\src\jobs\backup-cron.ts

- BackupResult · interface · L32-L41 — Result shape for a backup attempt, carrying skip/failure reasons plus upload metadata (bucket, key, size) so master-cron can report outcomes uniformly.
- isSundayTwoAmIst · function · L46-L54 — Determines whether the current moment falls inside the Sunday 02:00–02:59 IST backup window by shifting UTC time by +5:30 and reading wall-clock components.
- runBackupScript · function · L60-L103 — Spawns the standalone backup.mjs script in a child process and resolves with the structured result parsed from its final JSON output line, never throwing.
- maybeRunWeeklyBackup · function · L108-L132 — Entry point that enforces the once-per-week schedule (IST window check plus 23-hour cooldown, bypassable via BACKUP_FORCE) and fires a high-severity ops alert when the backup genuinely fails.
