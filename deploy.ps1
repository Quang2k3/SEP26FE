<#
.SYNOPSIS
    SEP26FE Deployment Script - Deploy Frontend to local PC via Cloudflare Tunnel
.DESCRIPTION
    This script sets up and deploys the SEP26FE Next.js frontend on your local PC.
    It uses Docker Compose to run:
      1. Frontend container (ghcr.io/quang2k3/sep26fe:latest)
      2. Watchtower (auto-updates container when new image is pushed)
      3. Cloudflare Tunnel (exposes your local app to the internet)
.NOTES
    Prerequisites:
      - Docker Desktop installed and running
      - Logged in to GHCR: docker login ghcr.io -u <USERNAME> -p <GITHUB_PAT>
      - TUNNEL_TOKEN set in .env file (get from Cloudflare Zero Trust dashboard)
#>

param(
    [Parameter()]
    [ValidateSet("up", "down", "restart", "status", "logs", "update", "setup")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colors for output
function Write-Step($msg) { Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[✗] $msg" -ForegroundColor Red }

# Check Docker is running
function Test-Docker {
    try {
        docker info *>$null
        return $true
    } catch {
        Write-Err "Docker is not running. Please start Docker Desktop first."
        return $false
    }
}

# Check GHCR authentication
function Test-GhcrAuth {
    Write-Step "Checking GHCR authentication..."
    $configPath = "$env:USERPROFILE\.docker\config.json"
    if (Test-Path $configPath) {
        $config = Get-Content $configPath -Raw
        if ($config -match "ghcr.io") {
            Write-Success "GHCR authentication found."
            return $true
        }
    }
    Write-Warn "Not authenticated to GHCR. Run: docker login ghcr.io -u <USERNAME> -p <GITHUB_PAT>"
    return $false
}

# Check .env file has TUNNEL_TOKEN
function Test-EnvFile {
    $envFile = Join-Path $ProjectDir ".env"
    if (-not (Test-Path $envFile)) {
        Write-Err ".env file not found at $envFile"
        Write-Warn "Create a .env file with: TUNNEL_TOKEN=<your-cloudflare-tunnel-token>"
        return $false
    }
    $content = Get-Content $envFile -Raw
    if ($content -notmatch "TUNNEL_TOKEN=") {
        Write-Warn "TUNNEL_TOKEN not found in .env file."
        Write-Warn "Add: TUNNEL_TOKEN=<your-cloudflare-tunnel-token>"
        return $false
    }
    Write-Success ".env file configured with TUNNEL_TOKEN."
    return $true
}

switch ($Action) {
    "setup" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host "  SEP26FE Deployment Setup" -ForegroundColor Magenta
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host ""

        # Step 1: Check Docker
        Write-Step "Step 1: Checking Docker..."
        if (-not (Test-Docker)) { exit 1 }
        Write-Success "Docker is running."

        # Step 2: Check GHCR auth
        Write-Step "Step 2: Checking GHCR authentication..."
        if (-not (Test-GhcrAuth)) {
            Write-Host ""
            $pat = Read-Host "Enter your GitHub Personal Access Token (with read:packages scope)"
            $username = Read-Host "Enter your GitHub username"
            $pat | docker login ghcr.io -u $username --password-stdin
            if ($LASTEXITCODE -ne 0) {
                Write-Err "GHCR login failed."
                exit 1
            }
            Write-Success "Logged in to GHCR."
        }

        # Step 3: Check .env
        Write-Step "Step 3: Checking .env configuration..."
        $envFile = Join-Path $ProjectDir ".env"
        $needToken = $true
        if (Test-Path $envFile) {
            $content = Get-Content $envFile -Raw
            if ($content -match "TUNNEL_TOKEN=.+") {
                Write-Success "TUNNEL_TOKEN already configured."
                $needToken = $false
            }
        }
        if ($needToken) {
            Write-Host ""
            Write-Warn "You need a Cloudflare Tunnel token."
            Write-Host "  1. Go to https://one.dash.cloudflare.com/" -ForegroundColor Gray
            Write-Host "  2. Navigate to: Networks > Tunnels" -ForegroundColor Gray
            Write-Host "  3. Create a tunnel or use existing one" -ForegroundColor Gray
            Write-Host "  4. Copy the tunnel token" -ForegroundColor Gray
            Write-Host ""
            $token = Read-Host "Enter your Cloudflare Tunnel Token"
            
            # Preserve existing env content and append TUNNEL_TOKEN
            if (Test-Path $envFile) {
                $existingContent = Get-Content $envFile -Raw
                if ($existingContent -notmatch "TUNNEL_TOKEN") {
                    Add-Content $envFile "`nTUNNEL_TOKEN=$token"
                }
            } else {
                "TUNNEL_TOKEN=$token" | Out-File $envFile -Encoding UTF8
            }
            Write-Success "TUNNEL_TOKEN saved to .env"
        }

        Write-Host ""
        Write-Success "Setup complete! Run: .\deploy.ps1 up"
    }

    "up" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  Deploying SEP26FE..." -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""

        if (-not (Test-Docker)) { exit 1 }
        if (-not (Test-GhcrAuth)) { exit 1 }
        if (-not (Test-EnvFile)) { exit 1 }

        Write-Step "Pulling latest image..."
        docker pull ghcr.io/quang2k3/sep26fe:latest

        Write-Step "Starting services (frontend + watchtower + cloudflare tunnel)..."
        docker compose -f (Join-Path $ProjectDir "docker-compose.yml") up -d

        Write-Host ""
        Write-Success "Deployment complete!"
        Write-Host ""
        Write-Host "  Local:    http://localhost:3000" -ForegroundColor Gray
        Write-Host "  Tunnel:   (check your Cloudflare dashboard for public URL)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Watchtower will auto-update the container every 60s" -ForegroundColor Gray
        Write-Host "  when a new image is pushed to GHCR." -ForegroundColor Gray
        Write-Host ""
    }

    "down" {
        Write-Step "Stopping all services..."
        docker compose -f (Join-Path $ProjectDir "docker-compose.yml") down
        Write-Success "All services stopped."
    }

    "restart" {
        Write-Step "Restarting all services..."
        docker compose -f (Join-Path $ProjectDir "docker-compose.yml") restart
        Write-Success "All services restarted."
    }

    "status" {
        Write-Step "Service status:"
        docker compose -f (Join-Path $ProjectDir "docker-compose.yml") ps
    }

    "logs" {
        Write-Step "Showing logs (Ctrl+C to exit)..."
        docker compose -f (Join-Path $ProjectDir "docker-compose.yml") logs -f --tail 100
    }

    "update" {
        Write-Step "Force pulling latest image and recreating container..."
        docker pull ghcr.io/quang2k3/sep26fe:latest
        docker compose -f (Join-Path $ProjectDir "docker-compose.yml") up -d --force-recreate frontend
        Write-Success "Frontend updated to latest version!"
    }
}
