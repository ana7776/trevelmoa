$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$skippedPublicPaths = New-Object System.Collections.Generic.List[string]

function Get-RelativePath {
  param(
    [string]$BasePath,
    [string]$Path
  )

  $baseUri = [System.Uri]((Resolve-Path -LiteralPath $BasePath).Path.TrimEnd('\') + '\')
  $pathUri = [System.Uri]((Resolve-Path -LiteralPath $Path).Path)
  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($pathUri).ToString()).Replace('/', '\')
}

function Test-DraftHtml {
  param([string]$Path)

  $leaf = Split-Path -Leaf $Path
  if ($leaf -match '^(draft-|_)' -or $leaf -match '(\.draft|_draft)\.html$') {
    return $true
  }

  if ($Path -notmatch '\.html$') {
    return $false
  }

  $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  return (
    $content -match 'data-status\s*=\s*["'']draft["'']' -or
    $content -match '<meta\s+name\s*=\s*["'']robots["'']\s+content\s*=\s*["''][^"'']*noindex' -or
    $content -match '"status"\s*:\s*"draft"' -or
    $content -match '"draft"\s*:\s*true' -or
    $content -match '"published"\s*:\s*false'
  )
}

function Copy-PublishedDirectory {
  param(
    [string]$Source,
    [string]$Target,
    [string]$PublicRoot
  )

  New-Item -ItemType Directory -Force -Path $Target | Out-Null

  Get-ChildItem -LiteralPath $Source -Recurse -File | ForEach-Object {
    $relative = Get-RelativePath -BasePath $Source -Path $_.FullName
    $destination = Join-Path $Target $relative
    $destinationDir = Split-Path -Parent $destination

    if (Test-DraftHtml -Path $_.FullName) {
      $publicPath = ($PublicRoot + "/" + $relative.Replace('\', '/')).TrimStart('/')
      $script:skippedPublicPaths.Add($publicPath)
      return
    }

    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $destination
  }
}

if (Test-Path $dist) {
  Remove-Item -LiteralPath $dist -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null

$items = @(
  "index.html",
  "assets",
  "calendar",
  "data",
  "info",
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
  if (($item -eq "info" -or $item -eq "pages" -or $item -eq "posts") -and (Test-Path $source -PathType Container)) {
    Copy-PublishedDirectory -Source $source -Target $target -PublicRoot $item
  } elseif (Test-Path $source -PathType Container) {
    Copy-Item -LiteralPath $source -Destination $target -Recurse
  } elseif (Test-Path $source) {
    Copy-Item -LiteralPath $source -Destination $target
  }
}

$sitemapPath = Join-Path $dist "sitemap.xml"
if ((Test-Path $sitemapPath) -and $skippedPublicPaths.Count -gt 0) {
  $sitemap = Get-Content -LiteralPath $sitemapPath -Raw -Encoding UTF8
  foreach ($publicPath in $skippedPublicPaths) {
    $loc = [regex]::Escape("https://trevelmoa.com/$publicPath")
    $sitemap = [regex]::Replace($sitemap, "(?s)\s*<url>\s*<loc>$loc</loc>.*?</url>", "")
  }
  Set-Content -LiteralPath $sitemapPath -Value $sitemap -Encoding UTF8
}

$blockedText = @(
  "AdSense Ready",
  (-join [char[]](0xC2B9, 0xC778, 0x20, 0xD6C4, 0x20, 0xC218, 0xC775)),
  (-join [char[]](0xC218, 0xC775, 0x20, 0xC601, 0xC5ED)),
  (-join [char[]](0xAD11, 0xACE0, 0x20, 0xBAA9, 0xC801, 0x20, 0xC0AC, 0xC774, 0xD2B8))
)

$leaks = New-Object System.Collections.Generic.List[string]
Get-ChildItem -LiteralPath $dist -Recurse -File -Include *.html,*.xml,*.json,*.css,*.js | ForEach-Object {
  $content = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
  foreach ($text in $blockedText) {
    if ($content.Contains($text)) {
      $relative = Get-RelativePath -BasePath $dist -Path $_.FullName
      $leaks.Add("$relative contains '$text'")
    }
  }
}

if ($leaks.Count -gt 0) {
  throw "Blocked visitor-facing monetization text in dist:`n$($leaks -join "`n")"
}

Write-Output "Prepared Cloudflare Pages output: $dist"
