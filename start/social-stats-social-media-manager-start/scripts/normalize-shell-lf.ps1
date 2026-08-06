#Requires -Version 5.1
param([string]$StartRoot = (Get-Location))

$files = @(
    (Join-Path $StartRoot 'docker\entrypoint-backup.sh'),
    (Join-Path $StartRoot 'docker\entrypoint-backend.sh'),
    (Join-Path $StartRoot 'docker\entrypoint-frontend-dev.sh'),
    (Join-Path $StartRoot 'docker\nginx\entrypoint-gateway.sh')
)

foreach ($path in $files) {
    if (-not (Test-Path $path)) { continue }
    $text = [IO.File]::ReadAllText($path) -replace "`r`n", "`n" -replace "`r", "`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [IO.File]::WriteAllText($path, $text, $utf8NoBom)
    Write-Host "LF normalized: $path"
}
