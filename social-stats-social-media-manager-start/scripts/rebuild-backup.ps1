#Requires -Version 5.1
# Rebuild and recreate ONLY the backup container (fixes stale supercronic image).
$StartDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $StartDir

& (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'normalize-shell-lf.ps1') -StartRoot $StartDir

$args = @(
  'compose', '--env-file', 'paths.env', '--env-file', '.env',
  '-f', 'docker-compose.yml', '--profile', 'backup'
)
$db = Get-Content '.env' -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*DB_NAME\s*=\s*\S' } | Select-Object -First 1
if ($db) { $args += '--profile', 'postgres' }

Write-Host 'Stopping old backup container...'
& docker @args rm -sf backup 2>$null

Write-Host 'Building backup image (no cache)...'
& docker @args build --no-cache backup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Starting backup...'
& docker @args up -d --force-recreate backup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'New logs (expect scheduler=cron, NOT supercronic):'
& docker @args logs --tail 20 backup
