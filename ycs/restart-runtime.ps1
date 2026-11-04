param([int]$ExpectedProcessId, [string]$ExpectedStartTicks, [string]$RequestId)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$statusFile = Join-Path $projectRoot '.local/restart-status.json'
function Set-RestartStatus([string]$State, [string]$Message) {
    @{requestId=$RequestId; state=$State; message=$Message} | ConvertTo-Json | Set-Content -LiteralPath $statusFile
}
try {
    # Let the HTTP response reach the settings page before stopping its server.
    Start-Sleep -Milliseconds 1000
    $record = Get-Content -LiteralPath (Join-Path $projectRoot '.local/runtime-process.json') -Raw | ConvertFrom-Json
    if ($record.id -ne $ExpectedProcessId -or $record.startTicks -ne $ExpectedStartTicks) { throw 'Runtime record changed.' }
    $runtimeProcess = Get-Process -Id $record.id -ErrorAction Stop
    if ($runtimeProcess.Path -ne $record.executable -or $runtimeProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $ExpectedStartTicks) { throw 'Runtime identity changed.' }
    Set-RestartStatus 'restarting' 'Restarting SPX.'
    & (Join-Path $PSScriptRoot 'stop-runtime.ps1')
    & (Join-Path $PSScriptRoot 'start-runtime.ps1') -Config $record.configuration -NodePath $record.executable
    Set-RestartStatus 'ready' 'SPX restarted.'
} catch {
    Set-RestartStatus 'failed' 'Restart failed. Use the SPX launcher and check .local/runtime-logs on the server.'
    exit 1
}
