#Requires -Version 5.1
param(
    [switch]$BuildImages
)

$StartRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $StartRoot '..')

if (-not (Test-Path 'paths.env')) { Copy-Item 'paths.env.example' 'paths.env' }
if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }

function Read-DotEnv($path) {
    Get-Content $path | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            Set-Variable -Name $parts[0].Trim() -Value $parts[1].Trim() -Scope Script
        }
    }
}

Read-DotEnv (Join-Path $PWD 'paths.env')
Read-DotEnv (Join-Path $PWD '.env')

$SourceRoot = Resolve-Path (Join-Path $PWD $SOURCE_REL)
$DataRoot = Resolve-Path -ErrorAction SilentlyContinue (Join-Path $PWD $DATA_REL)
if (-not $DataRoot) {
    $DataRoot = (Join-Path $PWD $DATA_REL)
    New-Item -ItemType Directory -Force -Path $DataRoot | Out-Null
    $DataRoot = Resolve-Path $DataRoot
}

$StartAbs = $PWD.Path
$BackendSrc = Join-Path $SourceRoot 'backend'
$FrontendSrc = Join-Path $SourceRoot 'frontend'

if ($BuildImages) {
    docker build -f docker/Dockerfile.backend `
        --build-context backend="$BackendSrc" `
        -t social-stats-backend:local .
    docker build -f docker/Dockerfile.gateway -t social-stats-gateway:local .
    docker build -f docker/Dockerfile.frontend-dev -t social-stats-frontend-dev:local .
}

$renderDir = Join-Path $PWD 'k8s\_rendered'
New-Item -ItemType Directory -Force -Path $renderDir | Out-Null
Copy-Item -Recurse -Force (Join-Path $PWD 'k8s\base\*') $renderDir

$files = Get-ChildItem $renderDir -Filter '*.yaml' -Recurse
foreach ($f in $files) {
    $text = Get-Content $f.FullName -Raw
    $text = $text.Replace('REPLACE_SOURCE_BACKEND', ($BackendSrc -replace '\\', '/'))
    $text = $text.Replace('REPLACE_SOURCE_FRONTEND', ($FrontendSrc -replace '\\', '/'))
    $text = $text.Replace('REPLACE_DATA_DIR', ($DataRoot.Path -replace '\\', '/'))
    $text = $text.Replace('REPLACE_START_DOCKER', (($StartAbs + '\docker') -replace '\\', '/'))
    $text = $text.Replace('REPLACE_START_NGINX_TEMPLATES', (($StartAbs + '\docker\nginx\templates') -replace '\\', '/'))
    $text = $text.Replace('REPLACE_START_NGINX', (($StartAbs + '\docker\nginx') -replace '\\', '/'))
    Set-Content -Path $f.FullName -Value $text -NoNewline
}

if (-not (Test-Path 'k8s\secret.yaml')) {
    Copy-Item 'k8s\base\secret.example.yaml' 'k8s\secret.yaml'
}

kubectl apply -f (Join-Path $renderDir 'namespace.yaml')
kubectl apply -f (Join-Path $PWD 'k8s\secret.yaml')
kubectl apply -f $renderDir

Write-Host 'Kubernetes manifests applied. Gateway NodePort: 30080'
