#Requires -Version 5.1
param(
    [ValidateSet('dev', 'prod', 'debug-dev')]
    [string]$Mode = 'dev',
    [switch]$Build,
    [switch]$Down
)

$StartRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $StartRoot '..')

if (-not (Test-Path 'paths.env')) {
    Copy-Item 'paths.env.example' 'paths.env'
    Write-Host 'Created paths.env from paths.env.example — edit SOURCE_REL if needed.'
}
if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created .env from .env.example.'
}

$normalizeScript = Join-Path $StartRoot 'normalize-shell-lf.ps1'
if (Test-Path $normalizeScript) {
    & $normalizeScript -StartRoot (Get-Location)
}

$composeArgs = @(
    'compose',
    '--env-file', 'paths.env',
    '--env-file', '.env',
    '-f', 'docker-compose.yml'
)

switch ($Mode) {
    'dev' { $composeArgs += '-f', 'docker-compose.dev.yml' }
    'debug-dev' {
        $composeArgs += '-f', 'docker-compose.dev.yml', '-f', 'docker-compose.debug.yml'
    }
}

if ($Down) {
    & docker @composeArgs down
    exit $LASTEXITCODE
}

$upArgs = @('up', '-d')
if ($Build) { $upArgs += '--build' }

& docker @composeArgs @upArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'Gateway:  http://localhost:8000'
Write-Host 'Frontend: http://localhost:3000 (dev mode)'
Write-Host 'Backend:  http://localhost:8001 (direct)'
Write-Host 'Health:   http://localhost:8000/api/health/services/'
