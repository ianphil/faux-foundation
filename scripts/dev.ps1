# scripts/dev.ps1 — Start the Faux Foundation dev loop
# Usage: .\scripts\dev.ps1         (process mode — daily driver)
#        .\scripts\dev.ps1 -Kind   (Kind cluster — container validation)

param(
    [switch]$Kind
)

$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot\..

# Load azd env vars into the current process
Write-Host "Loading azd environment..." -ForegroundColor Cyan
azd env get-values | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2].Trim('"')
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}
Write-Host "Environment loaded." -ForegroundColor Green

# Resolve ${VAR} placeholders in dapr.yaml with actual env values
$template = Get-Content dapr.yaml -Raw
$resolved = [regex]::Replace($template, '\$\{(\w+)\}', {
    param($match)
    $val = [Environment]::GetEnvironmentVariable($match.Groups[1].Value, 'Process')
    if ($val) { return $val } else { return $match.Value }
})

if ($Kind) {
    # Clean stale deploy manifests so Dapr regenerates with new env values
    Get-ChildItem -Recurse -Directory -Filter ".dapr" | ForEach-Object {
        $deploy = Join-Path $_.FullName "deploy"
        if (Test-Path $deploy) { Remove-Item $deploy -Recurse -Force }
    }
    $extDeploy = Join-Path (Resolve-Path ../copilot-llm-svc) ".dapr/deploy"
    if (Test-Path $extDeploy) { Remove-Item $extDeploy -Recurse -Force }

    # Write resolved config to temp file
    $tmpYaml = Join-Path $env:TEMP "dapr-resolved.yaml"
    [IO.File]::WriteAllText($tmpYaml, $resolved)

    Write-Host "Starting in Kind mode (container validation)..." -ForegroundColor Yellow
    # Start dapr in background so we can set up port-forwarding
    $daprProc = Start-Process -PassThru -NoNewWindow dapr -ArgumentList "run -k --run-file $tmpYaml"

    # Wait for chat pod to be ready
    Write-Host "Waiting for pods..." -ForegroundColor Cyan
    kubectl wait --for=condition=ready pod -l app=chat --timeout=120s --context kind-faux-foundation 2>$null

    # Port-forward chat to localhost:8080
    Write-Host "Chat available at http://localhost:8080" -ForegroundColor Green
    $portForward = Start-Process -PassThru -NoNewWindow kubectl -ArgumentList "port-forward svc/chat 8080:80 --context kind-faux-foundation"

    # Wait for dapr to exit, then clean up
    try {
        $daprProc | Wait-Process
    } finally {
        if ($portForward -and !$portForward.HasExited) {
            Stop-Process -Id $portForward.Id -Force -ErrorAction SilentlyContinue
        }
        Remove-Item $tmpYaml -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "Starting in process mode (fast iteration)..." -ForegroundColor Yellow
    Write-Host "Chat available at http://localhost:8080" -ForegroundColor Green
    $resolved | dapr run --run-file -
}

Pop-Location
