$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$recordFile = Join-Path $projectRoot '.local/runtime-process.json'
if (-not (Test-Path -LiteralPath $recordFile)) { Write-Output 'No recorded YCS runtime.'; return }
$record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
$runtimeProcess = Get-Process -Id $record.id -ErrorAction SilentlyContinue
if (-not $runtimeProcess) { Write-Output 'YCS runtime already stopped.'; return }
if ($runtimeProcess.Path -ne $record.executable -or $runtimeProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $record.startTicks) { throw 'Recorded process identity changed. No process was stopped.' }
Stop-Process -Id $runtimeProcess.Id
# Stop-Process returns before the process has exited and released its port.
Wait-Process -Id $runtimeProcess.Id -Timeout 10 -ErrorAction SilentlyContinue
if (Get-Process -Id $runtimeProcess.Id -ErrorAction SilentlyContinue | Where-Object { $_.StartTime.ToUniversalTime().Ticks.ToString() -eq $record.startTicks }) {
    throw "YCS runtime (PID $($runtimeProcess.Id)) did not exit within 10 seconds. Check Task Manager before starting it again."
}
if ($record.port) {
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (-not (Get-NetTCPConnection -LocalPort ([int]$record.port) -State Listen -ErrorAction SilentlyContinue)) { break }
        Start-Sleep -Milliseconds 250
    }
}
Write-Output 'YCS runtime stopped. Saved configuration and rundowns retained.'
