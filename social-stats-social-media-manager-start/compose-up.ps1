#Requires -Version 5.1
# Launcher — run from this folder:  .\compose-up.ps1
# Optional:  .\compose-up.ps1 -Build   (rebuild images)
& (Join-Path $PSScriptRoot 'scripts\compose-up.ps1') @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
