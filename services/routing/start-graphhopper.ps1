[CmdletBinding()]
param(
  [string]$JavaCommand = 'java',
  [string]$JarPath = 'data/raw/graphhopper-web-10.2.jar',
  [string]$PbfPath = 'data/raw/north-eastern-zone-latest.osm.pbf',
  [string]$ConfigPath = 'services/routing/graphhopper.yml',
  [int]$HeapGiB = 4
)

$ErrorActionPreference = 'Stop'

if ($HeapGiB -lt 1) {
  throw 'HeapGiB must be at least 1.'
}

try {
  $javaVersion = & $JavaCommand -version 2>&1 | Select-Object -First 1
} catch {
  throw "Java could not be executed with '$JavaCommand'. Install OpenJDK 17 or provide -JavaCommand."
}

if ($javaVersion -notmatch 'version "17\.') {
  throw "GraphHopper 10.2 requires Java 17 for this project. Detected: $javaVersion"
}

foreach ($path in @($JarPath, $PbfPath, $ConfigPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required file was not found: $path"
  }
}

if (Get-NetTCPConnection -State Listen -LocalPort 8989 -ErrorAction SilentlyContinue) {
  throw 'Port 8989 is already in use. Stop the existing service before starting GraphHopper.'
}

Write-Host "[SauraRoute Routing] $javaVersion"
Write-Host "[SauraRoute Routing] PBF: $PbfPath"
Write-Host "[SauraRoute Routing] Starting GraphHopper 10.2 on http://localhost:8989"

& $JavaCommand "-Xms$($HeapGiB)g" "-Xmx$($HeapGiB)g" -jar $JarPath server $ConfigPath
