<#
.SYNOPSIS
  Verify the health of all SauraRoute local services and dependencies.

.DESCRIPTION
  Checks prerequisites, data files, and running services. Returns exit code 0
  if all checks pass, 1 if any fail.

.EXAMPLE
  .\scripts\check-health.ps1
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$pass = 0
$fail = 0
$warn = 0

function Write-Check {
  param([string]$Name, [string]$Status, [string]$Detail = '')
  switch ($Status) {
    'PASS' {
      $script:pass++
      $icon = '[PASS]'
      $color = 'Green'
    }
    'FAIL' {
      $script:fail++
      $icon = '[FAIL]'
      $color = 'Red'
    }
    'WARN' {
      $script:warn++
      $icon = '[WARN]'
      $color = 'Yellow'
    }
  }
  $line = "  $icon $Name"
  if ($Detail) { $line = "$line - $Detail" }
  Write-Host $line -ForegroundColor $color
}

Write-Host ''
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '  SauraRoute Health Check' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''

# ---------------------------------------------------------------------------
# 1. Prerequisites
# ---------------------------------------------------------------------------
Write-Host '--- Prerequisites ---' -ForegroundColor White

# Java 17
try {
  $javaOut = cmd.exe /c "java -version 2>&1"
  $javaLine = ($javaOut | Select-Object -First 1)
  if ($javaLine -match 'version "17\.') {
    Write-Check 'Java 17' 'PASS' $javaLine
  } else {
    Write-Check 'Java 17' 'FAIL' "Found: $javaLine (need Java 17)"
  }
} catch {
  Write-Check 'Java 17' 'FAIL' 'java not found on PATH'
}

# Node.js 20+
try {
  $nodeVer = (node --version 2>$null)
  if ($nodeVer -match '^v(\d+)' -and [int]$Matches[1] -ge 20) {
    Write-Check 'Node.js 20+' 'PASS' $nodeVer
  } else {
    Write-Check 'Node.js 20+' 'FAIL' "Found: $nodeVer"
  }
} catch {
  Write-Check 'Node.js 20+' 'FAIL' 'node not found on PATH'
}

# npm 9+
try {
  $npmVer = (npm --version 2>$null)
  if ($npmVer -match '^(\d+)' -and [int]$Matches[1] -ge 9) {
    Write-Check 'npm 9+' 'PASS' "v$npmVer"
  } else {
    Write-Check 'npm 9+' 'FAIL' "Found: v$npmVer"
  }
} catch {
  Write-Check 'npm 9+' 'FAIL' 'npm not found on PATH'
}

# Python 3.10+
$pythonFound = $false
foreach ($cmd in @('python', 'python3')) {
  try {
    $pyVer = & $cmd --version 2>$null
    if ($pyVer -match 'Python (\d+)\.(\d+)' -and [int]$Matches[1] -ge 3 -and [int]$Matches[2] -ge 10) {
      Write-Check 'Python 3.10+' 'PASS' $pyVer
      $pythonFound = $true
      break
    }
  } catch { }
}
if (-not $pythonFound) {
  Write-Check 'Python 3.10+' 'FAIL' 'python/python3 not found or too old'
}

# ---------------------------------------------------------------------------
# 2. Data files
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '--- Data Files ---' -ForegroundColor White

$minSize = 1 * 1024 * 1024

$jarPath = Join-Path (Join-Path $repoRoot 'data') 'raw'
$jarPath = Join-Path $jarPath 'graphhopper-web-10.2.jar'
if ((Test-Path $jarPath) -and (Get-Item $jarPath).Length -ge $minSize) {
  $sz = [math]::Round((Get-Item $jarPath).Length / 1MB, 1)
  Write-Check 'GraphHopper JAR' 'PASS' "${sz} MB"
} else {
  Write-Check 'GraphHopper JAR' 'FAIL' "Missing or corrupt: $jarPath"
}

$pbfPath = Join-Path (Join-Path $repoRoot 'data') 'raw'
$pbfPath = Join-Path $pbfPath 'north-eastern-zone-latest.osm.pbf'
if ((Test-Path $pbfPath) -and (Get-Item $pbfPath).Length -ge $minSize) {
  $sz = [math]::Round((Get-Item $pbfPath).Length / 1MB, 1)
  Write-Check 'NER OSM PBF' 'PASS' "${sz} MB"
} else {
  Write-Check 'NER OSM PBF' 'FAIL' "Missing or corrupt: $pbfPath"
}

# .env file
$envPath = Join-Path $repoRoot '.env'
if (Test-Path $envPath) {
  Write-Check '.env file' 'PASS'
} else {
  Write-Check '.env file' 'WARN' 'Not found - copy .env.example to .env'
}

# node_modules
$nmPath = Join-Path (Join-Path (Join-Path $repoRoot 'services') 'api') 'node_modules'
if (Test-Path $nmPath) {
  Write-Check 'API node_modules' 'PASS'
} else {
  Write-Check 'API node_modules' 'FAIL' 'Run: npm ci in services/api'
}

# Python venv (Scripts/ for older Python, bin/ for Python 3.14+)
$mlVenvDir = Join-Path (Join-Path (Join-Path $repoRoot 'services') 'ml') 'venv'
$venvPyScripts = Join-Path (Join-Path $mlVenvDir 'Scripts') 'python.exe'
$venvPyBin     = Join-Path (Join-Path $mlVenvDir 'bin') 'python.exe'
if ((Test-Path $venvPyScripts) -or (Test-Path $venvPyBin)) {
  Write-Check 'ML Python venv' 'PASS'
} else {
  Write-Check 'ML Python venv' 'WARN' 'Not found - run .\scripts\setup.ps1'
}

# ---------------------------------------------------------------------------
# 3. ML model assets
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '--- ML Service ---' -ForegroundColor White

$modelMeta = Join-Path (Join-Path (Join-Path $repoRoot 'services') 'ml') 'models'
$modelMeta = Join-Path $modelMeta 'model_metadata.json'
if (Test-Path $modelMeta) {
  Write-Check 'ML model metadata' 'PASS' 'model_metadata.json present'
} else {
  Write-Check 'ML model metadata' 'FAIL' 'Missing: services/ml/models/model_metadata.json'
}

$evalReport = Join-Path (Join-Path (Join-Path $repoRoot 'services') 'ml') 'models'
$evalReport = Join-Path $evalReport 'evaluation_report.json'
if (Test-Path $evalReport) {
  Write-Check 'ML evaluation report' 'PASS'
} else {
  Write-Check 'ML evaluation report' 'WARN' 'Missing (non-critical)'
}

# ---------------------------------------------------------------------------
# 4. Running services
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '--- Running Services ---' -ForegroundColor White

# GraphHopper :8989
try {
  $ghResp = Invoke-WebRequest -Uri 'http://localhost:8989/health' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
  if ($ghResp.StatusCode -eq 200) {
    Write-Check 'GraphHopper :8989' 'PASS' 'healthy'
  } else {
    Write-Check 'GraphHopper :8989' 'FAIL' "HTTP $($ghResp.StatusCode)"
  }
} catch {
  Write-Check 'GraphHopper :8989' 'FAIL' 'not responding'
}

# API :3000
try {
  $apiResp = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
  if ($apiResp.StatusCode -eq 200) {
    Write-Check 'SauraRoute API :3000' 'PASS' 'healthy'
  } else {
    Write-Check 'SauraRoute API :3000' 'FAIL' "HTTP $($apiResp.StatusCode)"
  }
} catch {
  Write-Check 'SauraRoute API :3000' 'FAIL' 'not responding'
}

# PostgreSQL (optional)
try {
  $dbConn = New-Object System.Net.Sockets.TcpClient
  $dbConn.Connect('localhost', 5432)
  $dbConn.Close()
  Write-Check 'PostgreSQL :5432' 'PASS' 'port open'
} catch {
  Write-Check 'PostgreSQL :5432' 'WARN' 'not running (optional - API uses in-memory fallback)'
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '================================================================' -ForegroundColor Cyan
$total = $pass + $fail + $warn
$summaryColor = 'Green'
if ($fail -gt 0) { $summaryColor = 'Red' }
elseif ($warn -gt 0) { $summaryColor = 'Yellow' }
Write-Host "  Results: $pass passed, $fail failed, $warn warnings (of $total checks)" -ForegroundColor $summaryColor
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''

if ($fail -gt 0) {
  Write-Host '  Run .\scripts\setup.ps1 to fix missing dependencies.' -ForegroundColor Yellow
  Write-Host ''
  exit 1
}
exit 0
