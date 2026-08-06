#Requires -Version 5.1
<#
  Docker backup — one-shot or start scheduled backup container.

  One-shot (no schedule):
    .\scripts\run-backup-docker.ps1 -Once

  Start scheduled backup sidecar (supercronic):
    .\scripts\run-backup-docker.ps1 -Up
#>
param(
    [switch]$Once,
    [switch]$Up,
    [switch]$DryRun,
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$StartDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location $StartDir
try {
    $compose = @(
        "compose", "--env-file", "paths.env", "--env-file", ".env",
        "-f", "docker-compose.yml"
    )
    if (Test-Path "docker-compose.dev.yml") {
        $compose += "-f", "docker-compose.dev.yml"
    }
    $profileArgs = @("--profile", "backup")
    $dbLine = Get-Content (Join-Path $StartDir ".env") -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*DB_NAME\s*=\s*\S' } | Select-Object -First 1
    if ($dbLine -and $dbLine -notmatch '^\s*DB_NAME\s*=\s*$') {
        $profileArgs += @("--profile", "postgres")
    }

    if ($Up) {
        $cmd = @("docker") + $compose + $profileArgs + @("up", "-d")
        if ($Build) { $cmd += "--build" }
        $cmd += "backup"
        Write-Host "> $($cmd -join ' ')"
        & $cmd[0] $cmd[1..($cmd.Length - 1)]
        exit $LASTEXITCODE
    }

    $cmd = @("docker") + $compose + $profileArgs + @("run", "--rm")
    if ($Build) { $cmd += "--build" }
    $cmd += @("-e", "BACKUP_RUN_ONCE=true")
    if ($DryRun) { $cmd += @("-e", "BACKUP_DRY_RUN=true") }
    $cmd += "backup"
    Write-Host "> $($cmd -join ' ')"
    & $cmd[0] $cmd[1..($cmd.Length - 1)]
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
