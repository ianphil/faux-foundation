# scripts/kind-load.ps1 — Build container images and load into Kind cluster
# Usage: .\scripts\kind-load.ps1
#
# Builds all 4 service images and loads them into the faux-foundation
# Kind cluster. Run this before `.\scripts\dev.ps1 -Kind`.

param(
    [string]$Cluster = "faux-foundation"
)

$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot\..

$images = @(
    @{ Name = "faux-foundation/macgyver:dev";   Dockerfile = "Dockerfile";              Context = "." }
    @{ Name = "faux-foundation/tools:dev";      Dockerfile = "apps/tools/Dockerfile";    Context = "apps/tools" }
    @{ Name = "faux-foundation/chat:dev";       Dockerfile = "apps/chat/Dockerfile";     Context = "apps/chat" }
    @{ Name = "faux-foundation/llm-proxy:dev";  Dockerfile = "../copilot-llm-svc/Dockerfile"; Context = "../copilot-llm-svc" }
)

foreach ($img in $images) {
    Write-Host "`nBuilding $($img.Name)..." -ForegroundColor Cyan
    docker build -t $img.Name -f $img.Dockerfile $img.Context
    if ($LASTEXITCODE -ne 0) { throw "Failed to build $($img.Name)" }

    Write-Host "Loading $($img.Name) into Kind cluster '$Cluster'..." -ForegroundColor Yellow
    kind load docker-image $img.Name --name $Cluster
    if ($LASTEXITCODE -ne 0) { throw "Failed to load $($img.Name) into Kind" }

    Write-Host "$($img.Name) ready." -ForegroundColor Green
}

Write-Host "`nAll images built and loaded. Run '.\scripts\dev.ps1 -Kind' to start." -ForegroundColor Green
Pop-Location
