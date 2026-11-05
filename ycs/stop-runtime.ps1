$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$recordFile = Join-Path $projectRoot '.local/runtime-process.json'
if (-not (Test-Path -LiteralPath $recordFile)) { Write-Output 'No recorded YCS runtime.'; return }
$record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
$runtimeProcess = Get-Process -Id $record.id -ErrorAction SilentlyContinue
if (-not $runtimeProcess) { Write-Output 'YCS runtime already stopped.'; return }
if ($runtimeProcess.Path -ne $record.executable -or $runtimeProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $record.startTicks) { throw 'Recorded process identity changed. No process was stopped.' }
# Stop-Process cannot signal Node to shut down gracefully, so record that this
# stop was deliberate. The next start then begins with program stopped instead
# of restoring it (YCS.md, "Restart recovery").
$markerFile = Join-Path $projectRoot '.local/runtime-stopped.json'
$temporaryMarker = $markerFile + '.tmp'
@{ id = $runtimeProcess.Id; stoppedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() } | ConvertTo-Json | Set-Content -LiteralPath $temporaryMarker
Move-Item -LiteralPath $temporaryMarker -Destination $markerFile -Force
try { Stop-Process -Id $runtimeProcess.Id }
catch { Remove-Item -LiteralPath $markerFile -ErrorAction SilentlyContinue; throw }
Write-Output 'YCS runtime stopped. Saved configuration and rundowns retained.'
