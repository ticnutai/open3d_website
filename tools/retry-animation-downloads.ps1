Param(
  [string]$DownloadScript = "tools/download-medical-animations.ps1",
  [int]$MaxAttempts = 6,
  [int]$InitialDelaySec = 25
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $DownloadScript)) {
  throw "Download script not found: $DownloadScript"
}

$attempt = 0
$delay = [Math]::Max(5, $InitialDelaySec)
$lastOutput = @()
$completed = $false

while ($attempt -lt $MaxAttempts -and -not $completed) {
  $attempt += 1
  Write-Host "Attempt $attempt/$MaxAttempts - running animation sync..."

  $runOk = $true
  $result = $null
  try {
    $result = & $DownloadScript 2>&1
  } catch {
    $runOk = $false
    $result = @($_.Exception.Message)
  }

  $lastOutput = @($result)
  $text = ($lastOutput | Out-String)

  $throttled = $text -match "429|Too many requests"
  $wroteCatalog = $text -match "Animation catalog written:"
  $successExit = $runOk

  if ($successExit) {
    if ($throttled) {
      Write-Warning "Sync completed with throttling signals, catalog fallback was applied."
    } else {
      Write-Host "Sync completed without throttling."
    }
    $completed = $true
    break
  }

  if ($attempt -ge $MaxAttempts) {
    break
  }

  $jitter = Get-Random -Minimum 0 -Maximum 9
  $sleepSec = $delay + $jitter
  Write-Warning "Throttled or partial response detected. Waiting $sleepSec seconds before retry..."
  Start-Sleep -Seconds $sleepSec
  $delay = [Math]::Min([int]($delay * 1.8), 300)
}

if (-not $completed) {
  Write-Warning "Completed with throttling/partial results after $attempt attempts."
  $lastOutput | ForEach-Object { Write-Host $_ }
  exit 1
}

exit 0
