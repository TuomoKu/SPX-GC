param([string]$Config = '', [string]$NodePath = 'node')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$recordFile = Join-Path $projectRoot '.local/runtime-process.json'
if (-not $Config) {
    # Default to the configuration launched last, then to the development configuration.
    $Config = '.local/ycs-dev.json'
    if (Test-Path -LiteralPath $recordFile) {
        try {
            $lastConfiguration = (Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json).configuration
            # A record copied from another folder can name a configuration outside this checkout.
            if ($lastConfiguration -and $lastConfiguration.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -and ((Test-Path -LiteralPath $lastConfiguration -PathType Leaf) -or (Test-Path -LiteralPath ($lastConfiguration + '.bak') -PathType Leaf))) { $Config = $lastConfiguration }
        } catch { }
    }
}
$configurationFile = if ([IO.Path]::IsPathRooted($Config)) { [IO.Path]::GetFullPath($Config) } else { [IO.Path]::GetFullPath((Join-Path $projectRoot $Config)) }
if (-not $configurationFile.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Store the runtime configuration inside this checkout; SPX resolves configuration paths relative to server.js.' }
$configurationArgument = $configurationFile.Substring($projectRoot.Length + 1).Replace('\', '/')
$nodeExecutable = (Get-Command $NodePath -ErrorAction Stop).Source
try {
    $configuration = Get-Content -LiteralPath $configurationFile -Raw | ConvertFrom-Json
    if (-not $configuration.general) { throw 'Configuration has no general section' }
} catch {
    # A power cut can damage the file, or it can go missing. SPX restores it from
    # the backup when it starts, so read this launcher's settings from that backup.
    $backupFile = $configurationFile + '.bak'
    if (-not (Test-Path -LiteralPath $backupFile -PathType Leaf)) { throw "Configuration $configurationFile is missing or damaged and no backup exists at $backupFile." }
    $configuration = Get-Content -LiteralPath $backupFile -Raw | ConvertFrom-Json
    Write-Warning "Configuration $configurationFile is missing or damaged. SPX will restore it from $backupFile."
}
if (-not $configuration.ycs.enabled) { throw 'Enable YCS in the saved server configuration first.' }
if ($configuration.general.launchBrowser) { throw 'Set general.launchBrowser to false for runtime use.' }
$readinessHeaders = @{}
if ($configuration.ycs.apiKey) { $readinessHeaders.Authorization = 'Bearer ' + $configuration.ycs.apiKey }
$portNumber = [int]$configuration.general.port
if ($portNumber -lt 1 -or $portNumber -gt 65535) { throw 'Invalid configured port.' }
# Probe the address SPX listens on. A LAN-only listenHost does not answer on 127.0.0.1.
$listenHost = [string]$configuration.ycs.listenHost
$probeHost = if (-not $listenHost -or $listenHost -eq '0.0.0.0' -or $listenHost -eq '::') { '127.0.0.1' } elseif ($listenHost.Contains(':')) { "[$listenHost]" } else { $listenHost }
$baseUrl = "http://${probeHost}:$portNumber"
$readinessUrl = "$baseUrl/api/ycs/stages"
$mutexName = 'Local\YCS-SPX-' + $portNumber
$startupMutex = New-Object Threading.Mutex($false, $mutexName)
$ownsMutex = $false
$startedProcess = $null
try {
    try { $ownsMutex = $startupMutex.WaitOne(10000) } catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { throw 'Another runtime startup is in progress.' }
    $listener = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue
    # A power cut can damage the record. Treat that as no record: the port check
    # below still protects a server that is running.
    $record = $null
    if (Test-Path -LiteralPath $recordFile) {
        try { $record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json }
        catch { Write-Warning "Ignoring unreadable runtime record $recordFile." }
    }
    if ($record -and $record.id) {
        $runtimeProcess = Get-Process -Id $record.id -ErrorAction SilentlyContinue
        if ($runtimeProcess -and $runtimeProcess.Path -eq $record.executable -and $runtimeProcess.StartTime.ToUniversalTime().Ticks.ToString() -eq $record.startTicks) {
            if ($record.configuration -ne $configurationFile) { throw 'This checkout already runs a different configuration. Stop it first.' }
            if (-not ($listener | Where-Object OwningProcess -eq $runtimeProcess.Id)) { throw 'The recorded runtime is running but not listening. Check its logs.' }
            $null = Invoke-WebRequest $readinessUrl -Headers $readinessHeaders -TimeoutSec 3 -UseBasicParsing
            Write-Output "YCS already running (PID $($runtimeProcess.Id)). $baseUrl/ycs/data-manager"
            return
        }
    }
    # A server that is still shutting down can hold the port for a moment.
    for ($attempt = 0; $listener -and $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        $listener = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue
    }
    if ($listener) { throw "Port $portNumber belongs to another process. No server was changed." }
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules/express'))) { throw 'Install dependencies with npm ci first.' }
    $logFolder = Join-Path $projectRoot '.local/runtime-logs'
    $null = New-Item -ItemType Directory -Force -Path $logFolder
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $stdout = Join-Path $logFolder "$stamp.log"
    $stderr = Join-Path $logFolder "$stamp-error.log"
    # SPX runs in its own visible window, which starts Node and writes the runtime record.
    $quote = { param($value) '"{0}"' -f $value }
    $windowArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (& $quote (Join-Path $PSScriptRoot 'runtime-window.ps1')),
        '-NodeExecutable', (& $quote $nodeExecutable), '-ConfigurationFile', (& $quote $configurationFile), '-ConfigurationArgument', (& $quote $configurationArgument),
        '-Port', $portNumber, '-BaseUrl', (& $quote $baseUrl), '-Stdout', (& $quote $stdout), '-Stderr', (& $quote $stderr))
    $window = Start-Process -FilePath 'powershell.exe' -ArgumentList $windowArguments -WorkingDirectory $projectRoot -WindowStyle Normal -PassThru
    for ($attempt = 0; -not $startedProcess -and $attempt -lt 40; $attempt++) {
        try {
            $record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
            # A record from an earlier run names different log files.
            if ($record.stdout -eq $stdout) { $startedProcess = Get-Process -Id $record.id; $null = $startedProcess.Handle }
        } catch { }
        if (-not $startedProcess) {
            if ($window.HasExited) { throw 'The SPX window closed before the server started.' }
            Start-Sleep -Milliseconds 250
        }
    }
    if (-not $startedProcess) { throw 'The server did not start. See the SPX window.' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($startedProcess.HasExited) { throw "Runtime exited. See the SPX window, or $stderr" }
        try { $null = Invoke-WebRequest $readinessUrl -Headers $readinessHeaders -TimeoutSec 1 -UseBasicParsing; $ready = $true; break } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw "Runtime did not become ready at $readinessUrl. Check $stderr" }
    Write-Output "YCS runtime ready in its own window (PID $($startedProcess.Id)) using $configurationArgument. $baseUrl/ycs/data-manager"
    Write-Output 'Saved connections refresh in the background. Program starts stopped unless the last run crashed within ycs.restoreProgramWithinSeconds.'
} catch {
    if ($startedProcess -and -not $startedProcess.HasExited) { Stop-Process -Id $startedProcess.Id }
    throw
} finally {
    if ($ownsMutex) { $startupMutex.ReleaseMutex() }
    $startupMutex.Dispose()
}
