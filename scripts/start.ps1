<#
.SYNOPSIS
  Start the SauraRoute local development stack.

.DESCRIPTION
  Launches GraphHopper (routing engine) and the Node.js API service, then
  reports their URLs and status. Press Ctrl+C to stop all services.

.EXAMPLE
  .\scripts\start.ps1
#>
[CmdletBinding()]
param(
  [int]$GraphHopperHeapGiB = 4,
  [int]$GraphHopperTimeoutSeconds = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Write-Step  { param([string]$Msg) Write-Host "`n==> $Msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "    [OK] $Msg" -ForegroundColor Green }
function Write-Fail  { param([string]$Msg) Write-Host "    [FAIL] $Msg" -ForegroundColor Red }

function Wait-ForEndpoint {
  param(
    [string]$Url,
    [string]$Label,
    [int]$TimeoutSeconds = 60,
    [int]$IntervalSeconds = 3
  )
  Write-Host "    Waiting for $Label ($Url)..." -ForegroundColor White
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      if ($response.StatusCode -eq 200) {
        Write-Ok "$Label is ready"
        return $true
      }
    } catch { }
    Start-Sleep -Seconds $IntervalSeconds
  }
  Write-Fail "$Label did not become ready within ${TimeoutSeconds}s"
  return $false
}

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
Write-Step 'Pre-flight checks'

$jarPath = Join-Path (Join-Path (Join-Path $repoRoot 'data') 'raw') 'graphhopper-web-10.2.jar'
$pbfPath = Join-Path (Join-Path (Join-Path $repoRoot 'data') 'raw') 'north-eastern-zone-latest.osm.pbf'
$ghScript = Join-Path (Join-Path (Join-Path $repoRoot 'services') 'routing') 'start-graphhopper.ps1'
$apiDir   = Join-Path (Join-Path $repoRoot 'services') 'api'

$missingFiles = @()
foreach ($f in @($jarPath, $pbfPath, $ghScript)) {
  if (-not (Test-Path -LiteralPath $f -PathType Leaf)) {
    $missingFiles += $f
  }
}
if (-not (Test-Path (Join-Path $apiDir 'node_modules'))) {
  $missingFiles += 'services/api/node_modules'
}

if ($missingFiles.Count -gt 0) {
  Write-Fail "Missing required files/directories:"
  foreach ($f in $missingFiles) {
    Write-Host "         - $f" -ForegroundColor Yellow
  }
  Write-Host "`n    Run .\scripts\setup.ps1 first to prepare all dependencies." -ForegroundColor Yellow
  exit 1
}
Write-Ok 'All required files present'

# Check ports
foreach ($port in @(8989, 3000)) {
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
    Write-Fail "Port $port is already in use. Stop the existing process and retry."
    exit 1
  }
}
Write-Ok 'Required ports (8989, 3000) are available'

# ---------------------------------------------------------------------------
# Track background jobs for cleanup
# ---------------------------------------------------------------------------
$jobs = @()

function Stop-AllJobs {
  Write-Host "`n`n==> Shutting down services..." -ForegroundColor Yellow
  foreach ($j in $script:jobs) {
    if ($j -and $j.Id) {
      try {
        Stop-Job -Job $j -ErrorAction SilentlyContinue
        Remove-Job -Job $j -Force -ErrorAction SilentlyContinue
      } catch { }
    }
  }
  Write-Host "    All services stopped." -ForegroundColor Green
}

# Register cleanup on Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-AllJobs } -ErrorAction SilentlyContinue

# ---------------------------------------------------------------------------
# 1. Start GraphHopper
# ---------------------------------------------------------------------------
Write-Step 'Starting GraphHopper 10.2 routing engine'

$ghJob = Start-Job -ScriptBlock {
  param($Root, $Script, $Heap)
  Set-Location $Root
  & powershell.exe -ExecutionPolicy Bypass -File $Script -HeapGiB $Heap
} -ArgumentList $repoRoot, $ghScript, $GraphHopperHeapGiB

$jobs += $ghJob
Write-Host "    GraphHopper started as background job (ID: $($ghJob.Id))" -ForegroundColor DarkGray

# Wait for GraphHopper to be ready (first import can take a while)
$ghReady = Wait-ForEndpoint `
  -Url 'http://localhost:8989/health' `
  -Label 'GraphHopper :8989' `
  -TimeoutSeconds $GraphHopperTimeoutSeconds `
  -IntervalSeconds 5

if (-not $ghReady) {
  Write-Host "`n    GraphHopper may still be importing the OSM graph (first run takes 1-3 minutes)." -ForegroundColor Yellow
  Write-Host "    Check the GraphHopper output with: Receive-Job -Id $($ghJob.Id)" -ForegroundColor Yellow
  Write-Host "    Continuing to start the API anyway...`n" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 2. Start API service
# ---------------------------------------------------------------------------
Write-Step 'Starting SauraRoute API service'

$apiJob = Start-Job -ScriptBlock {
  param($ApiDir)
  Set-Location $ApiDir
  & npm run dev 2>&1
} -ArgumentList $apiDir

$jobs += $apiJob
Write-Host "    API started as background job (ID: $($apiJob.Id))" -ForegroundColor DarkGray

$apiReady = Wait-ForEndpoint `
  -Url 'http://localhost:3000/api/health' `
  -Label 'SauraRoute API :3000' `
  -TimeoutSeconds 30 `
  -IntervalSeconds 2

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '  SauraRoute Development Stack' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host "  Service                 URL                           Status" -ForegroundColor White
Write-Host "  ----------------------  ----------------------------  ------" -ForegroundColor DarkGray

$ghStatus = if ($ghReady) { 'READY' } else { 'STARTING' }
$ghColor  = if ($ghReady) { 'Green' } else { 'Yellow' }
Write-Host "  GraphHopper Routing     http://localhost:8989         " -NoNewline -ForegroundColor White
Write-Host $ghStatus -ForegroundColor $ghColor

$apiStatus = if ($apiReady) { 'READY' } else { 'STARTING' }
$apiColor  = if ($apiReady) { 'Green' } else { 'Yellow' }
Write-Host "  SauraRoute API          http://localhost:3000         " -NoNewline -ForegroundColor White
Write-Host $apiStatus -ForegroundColor $apiColor

Write-Host ''
Write-Host '  Health check:           .\scripts\check-health.ps1' -ForegroundColor DarkGray
Write-Host '  Stop all:               Press Ctrl+C' -ForegroundColor DarkGray
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''

# ---------------------------------------------------------------------------
# Keep running — stream job output until Ctrl+C
# ---------------------------------------------------------------------------
Write-Host '[SauraRoute] Streaming service output (Ctrl+C to stop)...' -ForegroundColor DarkGray
Write-Host ''

try {
  while ($true) {
    foreach ($j in $jobs) {
      try {
        $output = Receive-Job -Job $j -ErrorAction SilentlyContinue
        if ($output) {
          $output | ForEach-Object { Write-Host $_ }
        }
      } catch { }

      # If a job has stopped unexpectedly, report it
      if ($j.State -eq 'Failed' -or $j.State -eq 'Completed') {
        $label = if ($j.Id -eq $ghJob.Id) { 'GraphHopper' } else { 'API' }
        Write-Host "[WARNING] $label job has stopped (State: $($j.State))" -ForegroundColor Red
        $remaining = Receive-Job -Job $j -ErrorAction SilentlyContinue
        if ($remaining) { $remaining | ForEach-Object { Write-Host $_ } }
      }
    }
    Start-Sleep -Seconds 2
  }
} finally {
  Stop-AllJobs
}
