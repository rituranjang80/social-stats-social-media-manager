#Requires -Version 5.1
$StartDir = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { Get-Location }
$Runner = Join-Path $StartDir "..\social-stats-social-media-manager\scripts\run_backup.py"
if (-not (Test-Path $Runner)) {
    $paths = Join-Path $StartDir "paths.env"
    $rel = "..\social-stats-social-media-manager"
    if (Test-Path $paths) {
        $line = Get-Content $paths | Where-Object { $_ -match 'SOURCE_REL' } | Select-Object -First 1
        if ($line -match '=\s*(.+)') { $rel = $Matches[1].Trim() }
    }
    $Runner = (Resolve-Path (Join-Path $StartDir $rel)).Path + "\scripts\run_backup.py"
}
python $Runner --start-dir $StartDir @args
