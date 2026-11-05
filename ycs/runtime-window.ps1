param(
    [string]$NodeExecutable,
    [string]$ConfigurationFile,
    [string]$ConfigurationArgument,
    [int]$Port,
    [string]$BaseUrl,
    [string]$Stdout,
    [string]$Stderr
)
# The visible SPX window, started by start-runtime.ps1. Closing it stops SPX: Windows
# tells everything attached to a console when its window closes, and Node's SIGHUP
# handler in server.js records a deliberate stop.
#
# SPX writes to log files and this script shows them. A console pauses a program that
# writes to it while text is selected, so selecting text here must not reach SPX.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
$recordFile = Join-Path $projectRoot '.local/runtime-process.json'
$markerFile = Join-Path $projectRoot '.local/runtime-stopped.json'

function Wait-ToClose {
    Write-Host ''
    Write-Host 'Press Enter to close this window.'
    # Keys pressed while SPX was running must not close it before this can be read.
    try { $Host.UI.RawUI.FlushInputBuffer(); $null = Read-Host } catch { }
}
function Write-RuntimeRecord($Record) {
    $temporaryRecord = $recordFile + '.tmp'
    $Record | ConvertTo-Json | Set-Content -LiteralPath $temporaryRecord
    # Another process reading the record can briefly block replacing it.
    for ($attempt = 1; ; $attempt++) {
        try { Move-Item -LiteralPath $temporaryRecord -Destination $recordFile -Force; return }
        catch { if ($attempt -ge 50) { Remove-Item -LiteralPath $temporaryRecord -ErrorAction SilentlyContinue; throw }; Start-Sleep -Milliseconds 100 }
    }
}
function Exit-AfterServer {
    # A deliberate stop closes this window. Anything else stays up so the reason can be read.
    $stopped = $false
    try {
        $marker = Get-Content -LiteralPath $markerFile -Raw | ConvertFrom-Json
        # A marker left by an earlier run could name a reused process id.
        $startedAt = ([DateTimeOffset]$node.StartTime).ToUnixTimeMilliseconds()
        $stopped = $marker.id -eq $node.Id -and $marker.stoppedAt -ge $startedAt
    } catch { }
    if ($node.ExitCode -eq 0 -or $stopped) { exit 0 }
    Write-Host ''
    Write-Host "SPX stopped unexpectedly (exit code $($node.ExitCode))." -ForegroundColor Red
    Write-Host 'Run Start SPX to start it again. Logs:'
    Write-Host "  $Stdout"
    Write-Host "  $Stderr"
    Wait-ToClose
    exit 1
}
function Open-Log([string]$File) {
    $share = [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete
    $stream = New-Object IO.FileStream($File, [IO.FileMode]::Open, [IO.FileAccess]::Read, $share)
    New-Object IO.StreamReader($stream, (New-Object Text.UTF8Encoding($false)))
}

$node = $null
try {
    $Host.UI.RawUI.WindowTitle = "SPX on port $Port - close this window to stop SPX"
    [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
    # Someone copying a message from this window must not stop the show with Ctrl+C.
    try { [Console]::TreatControlCAsInput = $true } catch { }
    Write-Host "SPX is running in this window at $BaseUrl" -ForegroundColor Green
    Write-Host 'Closing this window stops SPX. Stop your graphics first: anything on air stays on screen until SPX starts again.' -ForegroundColor Yellow
    Write-Host ''
    # More libuv file-I/O threads, so one hung SMB read cannot block all file access.
    if (-not $env:UV_THREADPOOL_SIZE) { $env:UV_THREADPOOL_SIZE = '16' }
    $node = Start-Process -FilePath $NodeExecutable -ArgumentList @('server.js', ('"{0}"' -f $ConfigurationArgument)) -WorkingDirectory $projectRoot -NoNewWindow -PassThru -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr
    # Windows PowerShell only reports ExitCode for a process whose handle it has read.
    $null = $node.Handle
    $record = @{ id=$node.Id; executable=$NodeExecutable; startTicks=$node.StartTime.ToUniversalTime().Ticks.ToString(); configuration=$ConfigurationFile; port=$Port; url=$BaseUrl; stdout=$Stdout; stderr=$Stderr }
    Write-RuntimeRecord $record

    $logs = @((Open-Log $Stdout), (Open-Log $Stderr))
    while ($true) {
        $exited = $node.HasExited
        foreach ($log in $logs) {
            $text = $log.ReadToEnd()
            if ($text) { [Console]::Out.Write($text) }
        }
        if ($exited) { break }
        Start-Sleep -Milliseconds 500
    }
    foreach ($log in $logs) { $log.Dispose() }
    Exit-AfterServer
} catch {
    Write-Host ''
    # This window failing must not stop a server that is on air, or claim that it failed.
    if ($node -and -not $node.HasExited) {
        Write-Host ('This window stopped showing the log: ' + $_.Exception.Message) -ForegroundColor Yellow
        Write-Host "SPX is still running. Close this window to stop it. Logs: $Stdout" -ForegroundColor Yellow
        $node.WaitForExit()
        Exit-AfterServer
    }
    Write-Host ('Could not run SPX: ' + $_.Exception.Message) -ForegroundColor Red
    # Tells the launcher to report this now and leave this window up to be read.
    try { Set-Content -LiteralPath ($Stdout + '.failed') -Value $_.Exception.Message } catch { }
    Wait-ToClose
    exit 1
}
