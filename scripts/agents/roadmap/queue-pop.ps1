# scripts/agents/roadmap/queue-pop.ps1
# Reads oldest unconsumed queue file, echoes body, marks consumedAt + consumedBy + consumedInSessionId in-place.
# Invoked by UserPromptSubmit hook (when user types /goal alone) OR by /goal-from-roadmap slash command.

$ErrorActionPreference = 'Stop'
# Force UTF-8 output (PowerShell defaults to OEM/ANSI on Windows; queue files contain ₹/Devanagari/em-dash)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = "E:\NewClaude\bhaktisetu"
$liveDir = Join-Path $repoRoot "docs\roadmap\queue"
$dryrunDir = Join-Path $repoRoot "docs\roadmap\_dryrun\queue"

# Prefer live queue (production). Fall back to _dryrun/queue while orchestrator is in dry-run mode.
$queueDir = $null
if ((Test-Path $liveDir) -and ((Get-ChildItem -Path $liveDir -Filter "*.md" -File -ErrorAction SilentlyContinue).Count -gt 0)) {
  $queueDir = $liveDir
} elseif (Test-Path $dryrunDir) {
  $queueDir = $dryrunDir
} else {
  Write-Output "<!-- roadmap queue dir missing (checked both live + _dryrun) -->"
  exit 0
}

# Find oldest .md by filename (filename includes cycle ts prefix, so alphabetic sort = chronological)
$candidates = Get-ChildItem -Path $queueDir -Filter "*.md" -File | Sort-Object Name

foreach ($file in $candidates) {
  $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
  if ($content -match '(?s)^---\r?\n(.+?)\r?\n---\r?\n(.+)$') {
    $fm = $matches[1]
    $body = $matches[2]
    # Skip already consumed (consumedAt set to a real timestamp, not null)
    if ($fm -match 'consumedAt:\s*(?!null)\S+') { continue }

    # Mark consumed (replace `null` if present, else append fields at end of frontmatter)
    $sessionId = if ($env:CLAUDE_SESSION_ID) { $env:CLAUDE_SESSION_ID } else { "unknown-session" }
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $newFm = $fm
    if ($newFm -match 'consumedAt:\s*null') {
      $newFm = $newFm -replace 'consumedAt:\s*null', "consumedAt: $now"
    } elseif ($newFm -notmatch 'consumedAt:') {
      $newFm = $newFm.TrimEnd() + "`nconsumedAt: $now"
    }
    if ($newFm -match 'consumedBy:\s*null') {
      $newFm = $newFm -replace 'consumedBy:\s*null', "consumedBy: claude-code"
    } elseif ($newFm -notmatch 'consumedBy:') {
      $newFm = $newFm.TrimEnd() + "`nconsumedBy: claude-code"
    }
    if ($newFm -match 'consumedInSessionId:\s*null') {
      $newFm = $newFm -replace 'consumedInSessionId:\s*null', "consumedInSessionId: $sessionId"
    } elseif ($newFm -notmatch 'consumedInSessionId:') {
      $newFm = $newFm.TrimEnd() + "`nconsumedInSessionId: $sessionId"
    }
    Set-Content -Path $file.FullName -Value "---`n$newFm`n---`n$body" -NoNewline -Encoding UTF8

    # Extract queueId for Closes: trailer reminder
    $queueId = ""
    if ($fm -match 'queueId:\s*(\S+)') { $queueId = $matches[1] }

    # Echo body to stdout (becomes injected context for Claude)
    Write-Output "<!-- ROADMAP QUEUE ITEM: $($file.Name) -->"
    Write-Output ""
    Write-Output $body
    Write-Output ""
    Write-Output "<!-- On commit: include trailer 'Closes: $queueId' -->"
    exit 0
  }
}

Write-Output "<!-- roadmap queue empty -->"
exit 0
