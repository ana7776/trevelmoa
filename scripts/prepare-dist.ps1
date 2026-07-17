$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"

if (Test-Path $dist) {
  Remove-Item -LiteralPath $dist -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null

$items = @(
  "index.html",
  "assets",
  "pages",
  "posts",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "_redirects"
)

foreach ($item in $items) {
  $source = Join-Path $root $item
  $target = Join-Path $dist $item
  if (Test-Path $source -PathType Container) {
    Copy-Item -LiteralPath $source -Destination $target -Recurse
  } elseif (Test-Path $source) {
    Copy-Item -LiteralPath $source -Destination $target
  }
}

Write-Output "Prepared Cloudflare Pages output: $dist"
