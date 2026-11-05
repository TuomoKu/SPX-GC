param(
    [string]$GraphicsRoot = '',
    [string]$Config = '.local/ycs-dev.json',
    [string]$NodePath = 'node'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot
if (-not $GraphicsRoot) { $GraphicsRoot = Join-Path (Split-Path $projectRoot) 'ycs-graphics/graphics' }
$resolvedGraphics = (Resolve-Path -LiteralPath $GraphicsRoot).Path
if (-not (Test-Path -LiteralPath (Join-Path $resolvedGraphics 'ticker/ticker.html') -PathType Leaf)) {
    throw 'Choose the graphics directory containing ticker/ticker.html from the current ycs-graphics branch.'
}
$configurationFile = if ([IO.Path]::IsPathRooted($Config)) { $Config } else { Join-Path $projectRoot $Config }
if (-not (Test-Path -LiteralPath $configurationFile -PathType Leaf)) { throw 'Run npm run ycs:demo first, or supply an existing configuration with -Config.' }
$templateRoot = Join-Path $projectRoot 'ASSETS/templates'
$link = Join-Path $templateRoot 'ycs'
$null = New-Item -ItemType Directory -Force -Path $templateRoot
if (Test-Path -LiteralPath $link) {
    $existing = Get-Item -LiteralPath $link -Force
    if ($existing.LinkType -ne 'Junction' -or [IO.Path]::GetFullPath([string]$existing.Target) -ne [IO.Path]::GetFullPath($resolvedGraphics)) {
        throw "The template folder already exists with another target: $link. No files were replaced."
    }
} else {
    $null = New-Item -ItemType Junction -Path $link -Target $resolvedGraphics
}
$nodeExecutable = (Get-Command $NodePath -ErrorAction Stop).Source
Push-Location $projectRoot
try {
    & $nodeExecutable -e 'const store=require("./utils/config-store.cjs");store.update(process.argv[1],config=>{if(!config.ycs?.enabled)throw Error("Enable YCS first");config.ycs.graphicsRoot=process.argv[2];}).catch(error=>{console.error(error.message);process.exitCode=1;});' $configurationFile (Join-Path $resolvedGraphics 'ticker')
    if ($LASTEXITCODE -ne 0) { throw 'Could not save the graphics configuration.' }
} finally { Pop-Location }
Write-Output "Template picker: $link -> $resolvedGraphics"
Write-Output 'Restart SPX, then open Project Settings and import templates from ycs.'
