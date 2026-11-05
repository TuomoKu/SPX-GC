param([string]$Config = '', [string]$NodePath = '', [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
try {
    $projectRoot = Split-Path $PSScriptRoot
    $recordFile = Join-Path $projectRoot '.local/runtime-process.json'
    if (-not $NodePath) {
        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCommand) { $NodePath = $nodeCommand.Source }
        else {
            # Explorer may not have the same PATH as a development terminal.
            if (Test-Path -LiteralPath $recordFile) {
                $record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
                if (Test-Path -LiteralPath $record.executable -PathType Leaf) { $NodePath = $record.executable }
            }
        }
        if (-not $NodePath) { throw 'Node.js was not found. Install Node.js or pass -NodePath with its full path.' }
    }
    # Without -Config, start-runtime uses the configuration launched last.
    & (Join-Path $PSScriptRoot 'start-runtime.ps1') -Config $Config -NodePath $NodePath
    if (-not $NoBrowser) {
        # The runtime record holds the address SPX was probed on (its listenHost and port).
        $record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
        $url = if ($record.url) { [string]$record.url } else { 'http://127.0.0.1:' + [int]$record.port }
        Start-Process -FilePath ($url + '/')
    }
} catch {
    Write-Host ('Could not launch SPX: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
