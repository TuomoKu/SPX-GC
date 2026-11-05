$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$processFile = Join-Path $projectRoot '.local/process.json'
if (-not (Test-Path -LiteralPath $processFile)) { Write-Output 'No recorded development process.'; return }
$record = Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json
$developmentProcess = Get-Process -Id $record.id -ErrorAction SilentlyContinue
if (-not $developmentProcess) { Write-Output 'Development server already stopped.'; return }
if ($developmentProcess.Path -ne $record.executable -or $developmentProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $record.startTicks) { throw 'Process identity changed. Check the development process manually.' }
# Record a deliberate stop, as stop-runtime.ps1 does, so the next start begins with program stopped.
$markerFile = Join-Path $projectRoot '.local/runtime-stopped.json'
$temporaryMarker = $markerFile + '.tmp'
@{ id = $developmentProcess.Id; stoppedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() } | ConvertTo-Json | Set-Content -LiteralPath $temporaryMarker
Move-Item -LiteralPath $temporaryMarker -Destination $markerFile -Force
try { Stop-Process -Id $developmentProcess.Id }
catch { Remove-Item -LiteralPath $markerFile -ErrorAction SilentlyContinue; throw }
Write-Output 'YCS development server stopped. Saved rundowns retained.'
