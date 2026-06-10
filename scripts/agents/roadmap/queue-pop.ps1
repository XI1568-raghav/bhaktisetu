# scripts/agents/roadmap/queue-pop.ps1
# Reads oldest unconsumed queue file, echoes body, marks consumedAt + consumedBy + consumedInSessionId in-place.
# Invoked by UserPromptSubmit hook (when user types /goal alone) OR by /goal-from-roadmap slash command.

$ErrorActionPreference = 'Stop'
$repoRoot = "E:\NewClaude\bhaktisetu"
$queueDir = Join-Path $repoRoot "docs\roadmap\queue"

if (-not (Test-Path $queueDir)) {
  Write-Output "<!-- roadmap queue dir missing -->"
  exit 0
}

# Find oldest .md by filename (filename includes cycle ts prefix, so alphabetic sort = chronological)
$candidates = Get-ChildItem -Path $queueDir -Filter "*.md" -File | Sort-Object Name

foreach ($file in $candidates) {
  $content = Get-Content -Path $file.FullName -Raw
  if ($content -match '(?s)^---\r?\n(.+?)\r?\n---\r?\n(.+)$') {
    $fm = $matches[1]
    $body = $matches[2]
    # Skip already consumed (consumedAt set to a real timestamp, not null)
    if ($fm -match 'consumedAt:\s*(?!null)\S+') { continue }

    # Mark consumed
    $sessionId = if ($env:CLAUDE_SESSION_ID) { $env:CLAUDE_SESSION_ID } else { "unknown-session" }
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $newFm = $fm -replace 'consumedAt:\s*null', "consumedAt: $now"
    $newFm = $newFm -replace 'consumedBy:\s*null', "consumedBy: claude-code"
    $newFm = $newFm -replace 'consumedInSessionId:\s*null', "consumedInSessionId: $sessionId"
    Set-Content -Path $file.FullName -Value "---`n$newFm`n---`n$body" -NoNewline

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
