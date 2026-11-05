param([string]$NodePath = 'node', [string]$GraphicsRoot = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$nodeExecutable = (Get-Command $NodePath -ErrorAction Stop).Source
Push-Location $projectRoot
try {
    if (-not (Test-Path -LiteralPath 'node_modules\express')) { throw 'Install dependencies with npm ci first.' }
    if ($GraphicsRoot) { & $nodeExecutable ycs/setup-demo.cjs $GraphicsRoot } else { & $nodeExecutable ycs/setup-demo.cjs }
    if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the development configuration.' }
    $configuration = Get-Content '.local/ycs-dev.json' -Raw | ConvertFrom-Json
    $portNumber = $configuration.general.port
    if (Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue) { throw "Port $portNumber is already in use." }
    $startedProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @('server.js','.local/ycs-dev.json') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot '.local/server.log') -RedirectStandardError (Join-Path $projectRoot '.local/server-error.log')
    @{ id=$startedProcess.Id; executable=$nodeExecutable; startTicks=$startedProcess.StartTime.ToUniversalTime().Ticks.ToString() } | ConvertTo-Json | Set-Content '.local/process.json'
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try { $null = Invoke-WebRequest "http://127.0.0.1:$portNumber/api/ycs/stages" -TimeoutSec 1 -UseBasicParsing; $ready = $true; break } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw 'The server did not become ready. Check .local/server-error.log.' }
    Write-Output "Stage 1: http://127.0.0.1:$portNumber/gc/YCS-Stage-1/Show"
    Write-Output "Development PID: $($startedProcess.Id)"
} finally { Pop-Location }
