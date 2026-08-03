#Requires -Version 5.1
# Convert docker/*.sh to LF so bind-mounted entrypoints work on Linux (Windows CRLF breaks bash).
param(
    [string]$StartRoot = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..')
)

$StartRoot = (Resolve-Path $StartRoot).Path
$dockerDir = Join-Path $StartRoot 'docker'
if (-not (Test-Path $dockerDir)) {
    Write-Warning "No docker/ folder at $StartRoot"
    exit 0
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
Get-ChildItem -Path $dockerDir -Recurse -Filter '*.sh' | ForEach-Object {
    $raw = [System.IO.File]::ReadAllText($_.FullName)
    if ($raw -notmatch "`r") { return }
    $lf = $raw -replace "`r`n", "`n" -replace "`r", "`n"
    [System.IO.File]::WriteAllText($_.FullName, $lf, $utf8NoBom)
    Write-Host "Normalized LF: $($_.FullName)"
}
