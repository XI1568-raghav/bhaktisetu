# Darshya / BhaktiSetu — Chat Archive

Verbatim per-session transcripts of every Claude Code session that touched this codebase, exported from `C:\Users\DELL\.claude\projects\E--NewClaude\*.jsonl`.

- User prompts and assistant text are **verbatim**.
- Tool calls (Read, Edit, Bash, Grep, etc.) are collapsed to one-line summaries — full input was retained for short args, truncated for long ones.
- Tool results are truncated to ~400 chars per call (otherwise the export would be ~50 MB and unreadable).
- For the raw, lossless source: read the original `.jsonl` files at the source path above.

The exporter that produced these files is `_export.py` (re-run any time to refresh).

## Darshya / BhaktiSetu sessions

| Date | Session | User | Asst | Tools | What happened |
|---|---|---:|---:|---:|---|
| 2026-04-24 | [`b4237798…`](b4237798-e582-43f0-b28c-8d05421cb0e7.md) | 4 | 0 | 0 | Auth-failure stub ("Hi" → Not logged in). |
| 2026-04-24 | [`40a61171…`](40a61171-01e1-4a68-8d3b-53f03c838d8b.md) | 4 | 0 | 0 | Auth-failure stub ("hi" → Not logged in). |
| 2026-04-24 | [`17262dbc…`](17262dbc-1d3e-47d2-8b67-97392f88b997.md) | 12 | 1 | 0 | Auth-failure stub. |
| 2026-04-24 | [`038e0002…`](038e0002-5099-4d22-83b2-f98bbf480df7.md) | 350 | 7484 | 4055 | **Master session.** Spans Apr 24 → Apr 28. Most of Darshya was built here — initial scaffolding, Day 1-3 launch, brand sweeps (Poojly → BhaktiSetu → Darshya), Google sign-in cutover, mobile messages v2, E2E live smoke, sitemap fix. |
| 2026-04-24 | [`81cea934…`](81cea934-893c-4e04-bbd2-880fa99f2e09.md) | 17 | 443 | 297 | Secondary build session — substantial code work (3 MB transcript). |
| 2026-04-25 | [`7bff0439…`](7bff0439-e89e-4294-8cbc-9bea0b387651.md) | 7 | 0 | 0 | Auth-failure stub. |
| 2026-04-26 | [`d2903a0e…`](d2903a0e-c7cf-469b-8f41-8c34d9e243fb.md) | 8 | 61 | 31 | Mid-build session — focused work on a feature slice. |
| 2026-04-27 | [`b7ed3baa…`](b7ed3baa-1cd7-4b22-9971-4845127bbefd.md) | 1 | 0 | 0 | One-shot ("skill"). |
| 2026-04-27 | [`0dcee987…`](0dcee987-15e4-4272-a704-766f61166424.md) | 50 | 198 | 112 | Skills-marketplace install + the rebrand-to-Darshya prep. The session that produced the `originSessionId` on the project memory. |

**Read order** if catching up: master first (`038e0002`), then `81cea934` and `d2903a0e` for earlier feature work, then `0dcee987` for the rebrand context.

### Off-topic sessions (preserved separately)

These ran from the same parent directory (`E:\NewClaude`) but were not Darshya work. Moved to `_other/` so they don't pollute project context but are still archived:

- `_other/73d779de…` — stock research, top-20 by book value, 2026-04-24
- `_other/16051413…` — same prompt as above, continued
- `_other/1e5c5540…` — "Turing test / humanise" task, 2026-04-25

## Totals (Darshya scope only)

- **Sessions**: 9
- **User prompts**: 453
- **Assistant turns**: 8 187
- **Tool calls**: 4 495
- **Source bytes**: ~50 MB JSONL → ~4.5 MB markdown (compression mostly from collapsing tool I/O)

## Re-exporting

```bash
python E:/NewClaude/bhaktisetu/docs/chat-archive/_export.py
```

The script is idempotent — overwrites the per-session `.md` files in place. It does **not** know about the `_other/` segregation (you'll need to re-move those three files manually after a re-export, or extend the script to read a denylist).

## Limits & honesty

- **Tool results are truncated.** If a Bash command's output is the part you want, look it up in the original JSONL by `tool_use_id`.
- **System reminders, attachments, file-history snapshots are dropped.** They're noise; the JSONL still has them.
- **The current (post-/compact) turn is not in here.** Compaction discards the running session's tail until the next checkpoint write.
