$ErrorActionPreference = "Stop"

$RootPath = Resolve-Path (Join-Path $PSScriptRoot "..")
$ManifestPath = Join-Path $RootPath "manifest.json"
$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$Version = $Manifest.version
$PackageName = "youtube-anti-spoiler-extension-$Version"
$DistPath = Join-Path $RootPath "dist"
$StagePath = Join-Path $DistPath "$PackageName-stage"
$ZipPath = Join-Path $DistPath "$PackageName.zip"

$RuntimeEntries = @(
  "manifest.json",
  "icons",
  "popup",
  "src"
)

if (Test-Path -LiteralPath $StagePath) {
  Remove-Item -LiteralPath $StagePath -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $DistPath | Out-Null
New-Item -ItemType Directory -Force -Path $StagePath | Out-Null

foreach ($Entry in $RuntimeEntries) {
  $Source = Join-Path $RootPath $Entry
  $Destination = Join-Path $StagePath $Entry

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Required release entry is missing: $Entry"
  }

  if ((Get-Item -LiteralPath $Source).PSIsContainer) {
    Copy-Item -LiteralPath $Source -Destination $Destination -Recurse
  } else {
    Copy-Item -LiteralPath $Source -Destination $Destination
  }
}

if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -Path (Join-Path $StagePath "*") -DestinationPath $ZipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $StagePath -Recurse -Force

Write-Output "Created $ZipPath"
