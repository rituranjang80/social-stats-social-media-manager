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

& (Join-Path $StartRoot 'normalize-shell-lf.ps1') -StartRoot (Get-Location)

function Get-DotEnvValue {
    param([string]$Name, [string]$FilePath)
    if (-not (Test-Path $FilePath)) { return $null }
    $line = Get-Content $FilePath -ErrorAction SilentlyContinue |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
        Select-Object -First 1
    if (-not $line) { return $null }
    if ($line -match '=\s*(.*)$') {
        return $Matches[1].Trim().Trim('"').Trim("'")
    }
    return $null
}

$envPath = Join-Path (Get-Location) '.env'
$backupEnabled = Get-DotEnvValue -Name 'BACKUP_ENABLED' -FilePath $envPath
$dbName = Get-DotEnvValue -Name 'DB_NAME' -FilePath $envPath

$composeArgs = @(
    'compose',
    '--env-file', 'paths.env',
    '--env-file', '.env',
    '-f', 'docker-compose.yml'
)

# Scheduled backup sidecar (profile backup) starts with the app when enabled in .env
if ($null -eq $backupEnabled -or $backupEnabled -match '^(?i:true|1|yes|on)$') {
    $composeArgs += '--profile', 'backup'
}
if ($dbName) {
    $composeArgs += '--profile', 'postgres'
}

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
if ($composeArgs -contains 'backup') {
    Write-Host 'Backup:   scheduled container (profile backup) — logs: docker compose --env-file paths.env --env-file .env --profile backup logs -f backup'
}
