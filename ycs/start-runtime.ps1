param([string]$Config = '.local/ycs-dev.json', [string]$NodePath = 'node')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$configurationFile = if ([IO.Path]::IsPathRooted($Config)) { [IO.Path]::GetFullPath($Config) } else { [IO.Path]::GetFullPath((Join-Path $projectRoot $Config)) }
if (-not $configurationFile.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Store the runtime configuration inside this checkout; SPX resolves configuration paths relative to server.js.' }
$configurationArgument = $configurationFile.Substring($projectRoot.Length + 1).Replace('\', '/')
$nodeExecutable = (Get-Command $NodePath -ErrorAction Stop).Source
$configuration = Get-Content -LiteralPath $configurationFile -Raw | ConvertFrom-Json
if (-not $configuration.ycs.enabled) { throw 'Enable YCS in the saved server configuration first.' }
if ($configuration.general.launchBrowser) { throw 'Set general.launchBrowser to false for background runtime use.' }
$readinessHeaders = @{}
if ($configuration.ycs.apiKey) { $readinessHeaders.Authorization = 'Bearer ' + $configuration.ycs.apiKey }
$portNumber = [int]$configuration.general.port
if ($portNumber -lt 1 -or $portNumber -gt 65535) { throw 'Invalid configured port.' }
$recordFile = Join-Path $projectRoot '.local/runtime-process.json'
$mutexName = 'Local\YCS-SPX-' + $portNumber
$startupMutex = New-Object Threading.Mutex($false, $mutexName)
$ownsMutex = $false
$startedProcess = $null
try {
    try { $ownsMutex = $startupMutex.WaitOne(10000) } catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { throw 'Another runtime startup is in progress.' }
    $listener = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $recordFile) {
        $record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
        $runtimeProcess = Get-Process -Id $record.id -ErrorAction SilentlyContinue
        if ($runtimeProcess -and $runtimeProcess.Path -eq $record.executable -and $runtimeProcess.StartTime.ToUniversalTime().Ticks.ToString() -eq $record.startTicks) {
            if ($record.configuration -ne $configurationFile) { throw 'This checkout already runs a different configuration. Stop it first.' }
            if (-not ($listener | Where-Object OwningProcess -eq $runtimeProcess.Id)) { throw 'The recorded runtime is running but not listening. Check its logs.' }
            $null = Invoke-WebRequest "http://127.0.0.1:$portNumber/api/ycs/stages" -Headers $readinessHeaders -TimeoutSec 3
            Write-Output "YCS already running (PID $($runtimeProcess.Id)). http://127.0.0.1:$portNumber/ycs/data-manager"
            return
        }
    }
    if ($listener) { throw "Port $portNumber belongs to another process. No server was changed." }
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules/express'))) { throw 'Install dependencies with npm ci first.' }
    $logFolder = Join-Path $projectRoot '.local/runtime-logs'
    $null = New-Item -ItemType Directory -Force -Path $logFolder
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $stdout = Join-Path $logFolder "$stamp.log"
    $stderr = Join-Path $logFolder "$stamp-error.log"
    $startedProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @('server.js', ('"{0}"' -f $configurationArgument)) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    $record = @{ id=$startedProcess.Id; executable=$nodeExecutable; startTicks=$startedProcess.StartTime.ToUniversalTime().Ticks.ToString(); configuration=$configurationFile; port=$portNumber; stdout=$stdout; stderr=$stderr }
    $temporaryRecord = $recordFile + '.tmp'
    $record | ConvertTo-Json | Set-Content -LiteralPath $temporaryRecord
    Move-Item -LiteralPath $temporaryRecord -Destination $recordFile -Force
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($startedProcess.HasExited) { throw "Runtime exited. Check $stderr" }
        try { $null = Invoke-WebRequest "http://127.0.0.1:$portNumber/api/ycs/stages" -Headers $readinessHeaders -TimeoutSec 1; $ready = $true; break } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw "Runtime did not become ready. Check $stderr" }
    Write-Output "YCS runtime ready (PID $($startedProcess.Id)). http://127.0.0.1:$portNumber/ycs/data-manager"
    Write-Output 'Saved connections refresh in the background. Program starts stopped unless the last run crashed within ycs.restoreProgramWithinSeconds.'
} catch {
    if ($startedProcess -and -not $startedProcess.HasExited) { Stop-Process -Id $startedProcess.Id }
    throw
} finally {
    if ($ownsMutex) { $startupMutex.ReleaseMutex() }
    $startupMutex.Dispose()
}
