param(
  [string]$DbUrl = "",
  [string]$SchemaPath = "database/schema.sql"
)

$ErrorActionPreference = "Stop"

function Get-EnvValueFromFile {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) { return "" }
  $line = Get-Content $FilePath | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
  if (-not $line) { return "" }
  return ($line -replace "^\s*$Key\s*=", "").Trim()
}

if (-not $DbUrl) {
  $DbUrl = $env:SUPABASE_DB_URL
}

if (-not $DbUrl) {
  $DbUrl = Get-EnvValueFromFile -FilePath "backend/.env" -Key "SUPABASE_DB_URL"
}

if (-not $DbUrl) {
  throw "SUPABASE_DB_URL not found. Pass -DbUrl or set it in backend/.env."
}

if (-not (Test-Path $SchemaPath)) {
  throw "Schema file not found: $SchemaPath"
}

Write-Host "Applying schema file: $SchemaPath"
Write-Host "Target database: $($DbUrl.Split('@')[-1])"

& psql "$DbUrl" -v ON_ERROR_STOP=1 -f "$SchemaPath"

if ($LASTEXITCODE -ne 0) {
  throw "Schema apply failed."
}

Write-Host "Schema apply complete."
