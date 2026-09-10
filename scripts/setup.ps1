<#
.SYNOPSIS
  SauraRoute one-time local setup script.

.DESCRIPTION
  Checks prerequisites, downloads required runtime data files, and installs
  project dependencies so that a fresh clone is ready for development.

  Safe to run repeatedly -- existing valid files are never redownloaded.

.EXAMPLE
  .\scripts\setup.ps1
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Step  { param([string]$Msg) Write-Host "`n==> $Msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "    [OK] $Msg" -ForegroundColor Green }
function Write-Skip  { param([string]$Msg) Write-Host "    [SKIP] $Msg" -ForegroundColor Yellow }
function Write-Fail  { param([string]$Msg) Write-Host "    [FAIL] $Msg" -ForegroundColor Red }

# Resolve repo root: this script lives in scripts/, so repo root is one level up.
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$dataRaw       = Join-Path (Join-Path $repoRoot 'data') 'raw'
$dataProcessed = Join-Path (Join-Path $repoRoot 'data') 'processed'
$ghCacheDir    = Join-Path $dataProcessed 'graphhopper-cache'
$apiDir        = Join-Path (Join-Path $repoRoot 'services') 'api'
$mlDir         = Join-Path (Join-Path $repoRoot 'services') 'ml'

$jarPath = Join-Path $dataRaw 'graphhopper-web-10.2.jar'
$pbfPath = Join-Path $dataRaw 'north-eastern-zone-latest.osm.pbf'

$jarUrl = 'https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/10.2/graphhopper-web-10.2.jar'
$pbfUrl = 'https://download.geofabrik.de/asia/india/north-eastern-zone-latest.osm.pbf'

# Minimum file size (1 MB) to consider a download valid.
$minFileSizeBytes = 1 * 1024 * 1024

$allPassed = $true

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
Write-Step 'Checking prerequisites'

# --- Java 17 ---
$javaOk = $false
try {
  $javaVersionOut = cmd.exe /c "java -version 2>&1"
  $javaLine = ($javaVersionOut | Select-Object -First 1)
  if ($javaLine -match 'version "17\.') {
    Write-Ok "Java 17 detected: $javaLine"
    $javaOk = $true
  } else {
    Write-Fail "Java 17 required. Detected: $javaLine"
    Write-Host "         Install Eclipse Adoptium Temurin 17: https://adoptium.net/" -ForegroundColor Yellow
    $allPassed = $false
  }
} catch {
  Write-Fail "Java not found on PATH. Install OpenJDK 17: https://adoptium.net/"
  $allPassed = $false
}

# --- Node.js 20+ ---
$nodeOk = $false
try {
  $nodeVersion = (node --version 2>$null)
  if ($nodeVersion -match '^v(\d+)') {
    $nodeMajor = [int]$Matches[1]
    if ($nodeMajor -ge 20) {
      Write-Ok "Node.js detected: $nodeVersion"
      $nodeOk = $true
    } else {
      Write-Fail "Node.js 20+ required. Detected: $nodeVersion"
      Write-Host "         Download from https://nodejs.org/" -ForegroundColor Yellow
      $allPassed = $false
    }
  }
} catch {
  Write-Fail "Node.js not found on PATH. Install Node.js 20+: https://nodejs.org/"
  $allPassed = $false
}

# --- npm 9+ ---
$npmOk = $false
try {
  $npmVersion = (npm --version 2>$null)
  if ($npmVersion -match '^(\d+)') {
    $npmMajor = [int]$Matches[1]
    if ($npmMajor -ge 9) {
      Write-Ok "npm detected: v$npmVersion"
      $npmOk = $true
    } else {
      Write-Fail "npm 9+ required. Detected: v$npmVersion"
      $allPassed = $false
    }
  }
} catch {
  Write-Fail "npm not found on PATH."
  $allPassed = $false
}

# --- Python 3.10+ ---
$pythonOk = $false
$pythonCmd = $null
foreach ($cmd in @('python', 'python3')) {
  try {
    $pyVer = & $cmd --version 2>$null
    if ($pyVer -match 'Python (\d+)\.(\d+)') {
      $pyMajor = [int]$Matches[1]
      $pyMinor = [int]$Matches[2]
      if ($pyMajor -ge 3 -and $pyMinor -ge 10) {
        Write-Ok "Python detected: $pyVer (command: $cmd)"
        $pythonOk = $true
        $pythonCmd = $cmd
        break
      }
    }
  } catch { }
}
if (-not $pythonOk) {
  Write-Fail "Python 3.10+ not found. Install from https://www.python.org/downloads/"
  $allPassed = $false
}

if (-not $allPassed) {
  Write-Host "`n[SauraRoute Setup] Some prerequisites are missing. Fix the above issues and re-run." -ForegroundColor Red
  exit 1
}

# ---------------------------------------------------------------------------
# 2. Create required directories
# ---------------------------------------------------------------------------
Write-Step 'Creating required directories'

foreach ($dir in @($dataRaw, $dataProcessed, $ghCacheDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Ok "Created: $dir"
  } else {
    Write-Skip "Already exists: $dir"
  }
}

# ---------------------------------------------------------------------------
# 3. Copy .env.example -> .env if missing
# ---------------------------------------------------------------------------
Write-Step 'Checking environment file'

$envFile    = Join-Path $repoRoot '.env'
$envExample = Join-Path $repoRoot '.env.example'

if (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Ok "Copied .env.example -> .env (edit with your local values)"
  } else {
    Write-Fail ".env.example not found -- cannot create .env"
    $allPassed = $false
  }
} else {
  Write-Skip ".env already exists"
}

# ---------------------------------------------------------------------------
# 4. Download GraphHopper 10.2 JAR
# ---------------------------------------------------------------------------
Write-Step 'GraphHopper 10.2 JAR'

function Test-ValidFile {
  param([string]$Path, [long]$MinSize)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
  return (Get-Item -LiteralPath $Path).Length -ge $MinSize
}

if (Test-ValidFile $jarPath $minFileSizeBytes) {
  $jarSize = [math]::Round((Get-Item $jarPath).Length / 1MB, 1)
  Write-Skip "Already present (${jarSize} MB): $jarPath"
} else {
  Write-Host "    Downloading GraphHopper 10.2 JAR (~50 MB)..." -ForegroundColor White
  Write-Host "    Source: $jarUrl" -ForegroundColor DarkGray
  try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $jarUrl -OutFile $jarPath -UseBasicParsing
    $ProgressPreference = 'Continue'

    if (Test-ValidFile $jarPath $minFileSizeBytes) {
      $jarSize = [math]::Round((Get-Item $jarPath).Length / 1MB, 1)
      Write-Ok "Downloaded (${jarSize} MB): $jarPath"
    } else {
      Write-Fail "Downloaded file is too small or corrupt. Delete and retry."
      $allPassed = $false
    }
  } catch {
    Write-Fail "Download failed: $_"
    Write-Host "         Manual download: $jarUrl" -ForegroundColor Yellow
    Write-Host "         Place the file at: $jarPath" -ForegroundColor Yellow
    $allPassed = $false
  }
}

# ---------------------------------------------------------------------------
# 5. Download NER OSM PBF
# ---------------------------------------------------------------------------
Write-Step 'NER OSM PBF extract'

if (Test-ValidFile $pbfPath $minFileSizeBytes) {
  $pbfSize = [math]::Round((Get-Item $pbfPath).Length / 1MB, 1)
  Write-Skip "Already present (${pbfSize} MB): $pbfPath"
} else {
  Write-Host "    Downloading North-Eastern Zone OSM extract (~40-60 MB)..." -ForegroundColor White
  Write-Host "    Source: $pbfUrl" -ForegroundColor DarkGray
  try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $pbfUrl -OutFile $pbfPath -UseBasicParsing
    $ProgressPreference = 'Continue'

    if (Test-ValidFile $pbfPath $minFileSizeBytes) {
      $pbfSize = [math]::Round((Get-Item $pbfPath).Length / 1MB, 1)
      Write-Ok "Downloaded (${pbfSize} MB): $pbfPath"
    } else {
      Write-Fail "Downloaded file is too small or corrupt. Delete and retry."
      $allPassed = $false
    }
  } catch {
    Write-Fail "Download failed: $_"
    Write-Host "         Manual download: $pbfUrl" -ForegroundColor Yellow
    Write-Host "         Place the file at: $pbfPath" -ForegroundColor Yellow
    $allPassed = $false
  }
}

# ---------------------------------------------------------------------------
# 6. Install npm dependencies (services/api)
# ---------------------------------------------------------------------------
Write-Step 'Installing npm dependencies (services/api)'

$nodeModules = Join-Path $apiDir 'node_modules'
if (Test-Path $nodeModules) {
  Write-Skip "node_modules already present in services/api"
} else {
  Write-Host "    Running npm ci..." -ForegroundColor White
}
# Always run npm ci to ensure lock-file parity, but use --prefer-offline for speed.
Push-Location $apiDir
try {
  & npm ci --prefer-offline 2>&1 | Out-Null
  Write-Ok "npm dependencies installed for services/api"
} catch {
  Write-Fail "npm ci failed in services/api: $_"
  $allPassed = $false
} finally {
  Pop-Location
}

# ---------------------------------------------------------------------------
# 7. Create Python venv and install ML dependencies
# ---------------------------------------------------------------------------
Write-Step 'Setting up Python virtual environment (services/ml)'

$venvDir    = Join-Path $mlDir 'venv'
$reqFile    = Join-Path $mlDir 'requirements.txt'

# Python 3.14+ on Windows may place executables in bin/ instead of Scripts/.
$venvPythonScripts = Join-Path (Join-Path $venvDir 'Scripts') 'python.exe'
$venvPythonBin     = Join-Path (Join-Path $venvDir 'bin') 'python.exe'

if ((Test-Path $venvPythonScripts) -or (Test-Path $venvPythonBin)) {
  Write-Skip "Virtual environment already exists"
} else {
  Write-Host "    Creating virtual environment..." -ForegroundColor White
  & $pythonCmd -m venv $venvDir
  Write-Ok "Virtual environment created at $venvDir"
}

# Resolve the actual venv python path.
if (Test-Path $venvPythonScripts) {
  $venvPython = $venvPythonScripts
} elseif (Test-Path $venvPythonBin) {
  $venvPython = $venvPythonBin
} else {
  Write-Fail "Could not find python.exe in the virtual environment"
  $allPassed = $false
  $venvPython = $null
}

if ($venvPython -and (Test-Path $reqFile)) {
  Write-Host "    Installing pip dependencies..." -ForegroundColor White
  & $venvPython -m pip install --quiet --upgrade pip 2>&1 | Out-Null
  & $venvPython -m pip install --quiet -r $reqFile 2>&1 | Out-Null
  Write-Ok "Python dependencies installed"
} elseif (-not (Test-Path $reqFile)) {
  Write-Fail "requirements.txt not found at $reqFile"
  $allPassed = $false
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '================================================================' -ForegroundColor Cyan
if ($allPassed) {
  Write-Host '  SauraRoute setup complete!' -ForegroundColor Green
  Write-Host ''
  Write-Host '  Next steps:' -ForegroundColor White
  Write-Host '    1. Start the stack:       .\scripts\start.ps1' -ForegroundColor White
  Write-Host '    2. Check health:          .\scripts\check-health.ps1' -ForegroundColor White
} else {
  Write-Host '  SauraRoute setup completed with warnings.' -ForegroundColor Yellow
  Write-Host '  Review the [FAIL] messages above and re-run this script.' -ForegroundColor Yellow
}
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''

if (-not $allPassed) { exit 1 }
