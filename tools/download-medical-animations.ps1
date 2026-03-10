Param(
  [string]$OutDir = "media/animations",
  [string]$CatalogFile = "media/animations/catalog.json",
  [string]$ManualDir = "media/animations/manual",
  [int]$MinBytes = 120000,
  [int]$MinPixels = 180000,
  [switch]$HighQualityOnly = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}
if (-not (Test-Path -LiteralPath $ManualDir)) {
  New-Item -ItemType Directory -Path $ManualDir | Out-Null
}

$targets = @(
  [ordered]@{ key = "heart"; labels = @{ he = "פעולת הלב"; en = "Heart Function" }; queries = @("heart beat animation anatomy", "cardiac cycle animation"); titleKeywords = @("heart", "cardiac", "circulation") },
  [ordered]@{ key = "respiratory"; labels = @{ he = "מערכת הנשימה"; en = "Respiratory System" }; queries = @("breathing lungs animation", "respiratory system animation"); titleKeywords = @("lung", "respir", "breath") },
  [ordered]@{ key = "circulatory"; labels = @{ he = "מחזור הדם"; en = "Circulatory System" }; queries = @("blood circulation animation", "circulatory system animation"); titleKeywords = @("blood", "circulation", "vascular") },
  [ordered]@{ key = "lymphatic"; labels = @{ he = "מערכת הלימפה"; en = "Lymphatic System" }; queries = @("lymphatic system animation", "lymph flow animation"); titleKeywords = @("lymph") },
  [ordered]@{ key = "urinary"; labels = @{ he = "מערכת השתן"; en = "Urinary System" }; queries = @("urinary system animation", "kidney nephron animation"); titleKeywords = @("urinary", "kidney", "nephron", "bladder") },
  [ordered]@{ key = "nervous"; labels = @{ he = "מערכת העצבים"; en = "Nervous System" }; queries = @("nervous system animation", "neuron synapse animation"); titleKeywords = @("brain", "neuro", "nerve", "neuron", "synapse") },
  [ordered]@{ key = "head"; labels = @{ he = "ראש ומוח"; en = "Head and Brain" }; queries = @("brain anatomy animation", "cranial nerves animation"); titleKeywords = @("brain", "head", "cranial", "skull") }
)

function Get-SearchResults {
  param([string]$Query)

  $api = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=$([uri]::EscapeDataString($Query))&gsrlimit=24&prop=imageinfo&iiprop=url|mime|size|extmetadata&format=json"
  try {
    return Invoke-RestMethod -Uri $api -Method Get -TimeoutSec 30
  } catch {
    return $null
  }
}

function Get-OpenverseResults {
  param([string]$Query)

  $api = "https://api.openverse.org/v1/images/?q=$([uri]::EscapeDataString($Query))&license=cc0,by,by-sa&extension=gif&page_size=24"
  try {
    return Invoke-RestMethod -Uri $api -Method Get -TimeoutSec 30
  } catch {
    return $null
  }
}

function Get-RemoteContentLength {
  param([string]$Url)

  if ([string]::IsNullOrWhiteSpace($Url)) { return 0 }
  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 25
    $lenHeader = $resp.Headers["Content-Length"]
    if (-not $lenHeader) { return 0 }
    return [int64]$lenHeader
  } catch {
    return 0
  }
}

function Get-QualityScore {
  param(
    [int64]$ContentBytes,
    [int]$Width,
    [int]$Height,
    [string]$Mime,
    [string]$Title,
    [string[]]$TitleKeywords
  )

  $pixels = [int64]$Width * [int64]$Height
  $score = 0
  if ($Mime -eq "video/webm" -or $Mime -eq "video/mp4") {
    $score += 180
  } elseif ($Mime -eq "image/gif") {
    $score += 120
  }

  $score += [math]::Min([int]($pixels / 25000), 120)
  $score += [math]::Min([int]($ContentBytes / 60000), 120)

  $titleLower = [string]$Title
  $titleLower = $titleLower.ToLowerInvariant()
  foreach ($kw in $TitleKeywords) {
    if ([string]::IsNullOrWhiteSpace($kw)) { continue }
    if ($titleLower.Contains($kw.ToLowerInvariant())) {
      $score += 25
    }
  }
  return $score
}

function Test-QualityThreshold {
  param(
    [int64]$ContentBytes,
    [int]$Width,
    [int]$Height
  )

  if (-not $HighQualityOnly) { return $true }
  $pixels = [int64]$Width * [int64]$Height
  if ($pixels -lt $MinPixels) { return $false }
  if ($ContentBytes -lt $MinBytes) { return $false }
  return $true
}

function Get-ValidFileFromResults {
  param(
    $Results,
    [string[]]$TitleKeywords,
    [bool]$EnforceQuality = $true
  )

  if (-not $Results) {
    return @()
  }
  $hasQuery = $Results.PSObject.Properties.Name -contains 'query'
  if (-not $hasQuery -or -not $Results.query) {
    return @()
  }
  $hasPages = $Results.query.PSObject.Properties.Name -contains 'pages'
  if (-not $hasPages -or -not $Results.query.pages) {
    return @()
  }

  $candidates = @()
  $pages = @($Results.query.pages.PSObject.Properties.Value)
  foreach ($page in $pages) {
    if (-not $page.imageinfo -or $page.imageinfo.Count -eq 0) { continue }
    $info = $page.imageinfo[0]
    $mime = [string]$info.mime
    $url = ([string]$info.url) -replace "\s+", ""
    if (-not $url) { continue }

    $isAnim = $mime -like "video/*" -or $mime -eq "image/gif"
    if (-not $isAnim) { continue }

    $title = ([string]$page.title).ToLowerInvariant()
    if ($TitleKeywords -and $TitleKeywords.Count -gt 0) {
      $hasKeyword = $false
      foreach ($kw in $TitleKeywords) {
        if ([string]::IsNullOrWhiteSpace($kw)) { continue }
        if ($title.Contains($kw.ToLowerInvariant())) {
          $hasKeyword = $true
          break
        }
      }
      if (-not $hasKeyword) { continue }
    }

    $width = if ($info.width) { [int]$info.width } else { 0 }
    $height = if ($info.height) { [int]$info.height } else { 0 }
    $bytesFromInfo = if ($info.size) { [int64]$info.size } else { 0 }
    $bytes = if ($bytesFromInfo -gt 0) { $bytesFromInfo } else { Get-RemoteContentLength -Url $url }

    if ($EnforceQuality -and -not (Test-QualityThreshold -ContentBytes $bytes -Width $width -Height $height)) {
      continue
    }

    $candidates += [ordered]@{
      title = [string]$page.title
      url = $url
      mime = $mime
      width = $width
      height = $height
      bytes = $bytes
      license = [string]$info.extmetadata.LicenseShortName.value
      author = [string]$info.extmetadata.Artist.value
      sourcePage = "https://commons.wikimedia.org/wiki/$([uri]::EscapeDataString(([string]$page.title).Replace(' ', '_')))"
      provider = "Wikimedia Commons"
      score = Get-QualityScore -ContentBytes $bytes -Width $width -Height $height -Mime $mime -Title ([string]$page.title) -TitleKeywords $TitleKeywords
    }
  }

  return $candidates | Sort-Object -Property score -Descending
}

function Get-ValidFileFromOpenverse {
  param(
    $Results,
    [string[]]$TitleKeywords,
    [bool]$EnforceQuality = $true
  )

  if (-not $Results) {
    return @()
  }
  $hasResults = $Results.PSObject.Properties.Name -contains 'results'
  if (-not $hasResults -or -not $Results.results) {
    return @()
  }

  $candidates = @()
  foreach ($item in $Results.results) {
    $url = ([string]$item.url) -replace "\s+", ""
    if (-not $url) { continue }
    $mime = "image/gif"
    $title = [string]$item.title
    $titleLower = $title.ToLowerInvariant()

    if ($TitleKeywords -and $TitleKeywords.Count -gt 0) {
      $hasKeyword = $false
      foreach ($kw in $TitleKeywords) {
        if ([string]::IsNullOrWhiteSpace($kw)) { continue }
        if ($titleLower.Contains($kw.ToLowerInvariant())) {
          $hasKeyword = $true
          break
        }
      }
      if (-not $hasKeyword) { continue }
    }

    $width = if ($item.width) { [int]$item.width } else { 0 }
    $height = if ($item.height) { [int]$item.height } else { 0 }
    $bytes = Get-RemoteContentLength -Url $url

    if ($EnforceQuality -and -not (Test-QualityThreshold -ContentBytes $bytes -Width $width -Height $height)) {
      continue
    }

    $author = [string]$item.creator
    if ([string]::IsNullOrWhiteSpace($author)) { $author = "Unknown" }

    $license = [string]$item.license
    if ([string]::IsNullOrWhiteSpace($license)) { $license = "Unknown" }

    $providerUrl = [string]$item.foreign_landing_url
    if ([string]::IsNullOrWhiteSpace($providerUrl)) {
      $providerUrl = [string]$item.detail_url
    }

    $candidates += [ordered]@{
      title = $title
      url = $url
      mime = $mime
      width = $width
      height = $height
      bytes = $bytes
      license = $license
      author = $author
      sourcePage = $providerUrl
      provider = "Openverse"
      score = Get-QualityScore -ContentBytes $bytes -Width $width -Height $height -Mime $mime -Title $title -TitleKeywords $TitleKeywords
    }
  }

  return $candidates | Sort-Object -Property score -Descending
}

function Get-ExtensionFromMime {
  param([string]$Mime, [string]$Url)

  if ($Mime -eq "image/gif") { return ".gif" }
  if ($Mime -eq "video/webm") { return ".webm" }
  if ($Mime -eq "video/mp4") { return ".mp4" }
  if ($Mime -eq "video/ogg") { return ".ogv" }

  $ext = [System.IO.Path]::GetExtension($Url)
  if ([string]::IsNullOrWhiteSpace($ext)) { return ".webm" }
  return $ext
}

function Try-DownloadFile {
  param(
    [string]$Url,
    [string]$OutPath
  )

  for ($attempt = 1; $attempt -le 3; $attempt += 1) {
    try {
      Invoke-WebRequest -Uri $Url -OutFile $OutPath -TimeoutSec 90
      return $true
    } catch {
      if ($attempt -ge 3) { return $false }
      Start-Sleep -Milliseconds 450
    }
  }
  return $false
}

function Load-ExistingCatalogByKey {
  param([string]$Path)

  $map = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $map }
  try {
    $raw = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return $map }
    $json = $raw | ConvertFrom-Json
    $items = @($json.items)
    foreach ($item in $items) {
      $k = [string]$item.key
      if ([string]::IsNullOrWhiteSpace($k)) { continue }
      $map[$k] = $item
    }
  } catch {
    return @{}
  }
  return $map
}

function Try-AppendExistingEntry {
  param(
    [hashtable]$ExistingByKey,
    [string]$TargetKey,
    [ref]$CatalogItemsRef
  )

  if (-not $ExistingByKey.ContainsKey($TargetKey)) { return $false }
  $entry = $ExistingByKey[$TargetKey]
  $entryFile = [string]$entry.file
  if ([string]::IsNullOrWhiteSpace($entryFile)) { return $false }
  if (-not (Test-Path -LiteralPath $entryFile)) { return $false }

  $CatalogItemsRef.Value += $entry
  Write-Host "Reused existing:" $TargetKey "->" $entryFile
  return $true
}

function Get-MimeByExtension {
  param([string]$Ext)
  $cleanExt = [string]$Ext
  $cleanExt = $cleanExt.ToLowerInvariant()
  if ($cleanExt -eq ".webm") { return "video/webm" }
  if ($cleanExt -eq ".mp4") { return "video/mp4" }
  if ($cleanExt -eq ".ogv") { return "video/ogg" }
  return "image/gif"
}

function Try-AppendManualFileFallback {
  param(
    $Target,
    [ref]$CatalogItemsRef
  )

  $key = [string]$Target.key
  $directPatterns = @("$key.webm", "$key.mp4", "$key.ogv", "$key.gif")
  $candidateFiles = @()

  foreach ($name in $directPatterns) {
    $p = Join-Path $ManualDir $name
    if (Test-Path -LiteralPath $p) {
      $candidateFiles += (Get-Item -LiteralPath $p)
    }
  }

  if ($candidateFiles.Count -eq 0) {
    $allManual = @(Get-ChildItem -LiteralPath $ManualDir -File -ErrorAction SilentlyContinue)
    $candidateFiles = @($allManual | Where-Object {
      $n = $_.BaseName.ToLowerInvariant()
      $n.Contains($key.ToLowerInvariant())
    })
  }

  if ($candidateFiles.Count -eq 0) { return $false }

  $picked = $candidateFiles | Sort-Object Length -Descending | Select-Object -First 1
  if (-not $picked) { return $false }

  $mime = Get-MimeByExtension -Ext $picked.Extension
  $CatalogItemsRef.Value += [ordered]@{
    key = $key
    labels = [ordered]@{
      he = [string]$Target.labels.he
      en = [string]$Target.labels.en
    }
    file = ("media/animations/manual/{0}" -f $picked.Name)
    mime = $mime
    title = "Manual imported animation"
    quality = [ordered]@{
      mode = "manual"
      bytes = [int64]$picked.Length
      width = 0
      height = 0
      score = 0
    }
    source = [ordered]@{
      provider = "Manual import"
      page = ""
      license = "User supplied"
      author = "User"
      query = ""
    }
  }

  Write-Host "Reused manual file:" $key "->" $picked.Name
  return $true
}

function Try-AppendLocalFileFallback {
  param(
    $Target,
    [ref]$CatalogItemsRef
  )

  $key = [string]$Target.key
  $patterns = @("$key.webm", "$key.mp4", "$key.ogv", "$key.gif")
  $pickedPath = $null
  foreach ($name in $patterns) {
    $candidatePath = Join-Path $OutDir $name
    if (Test-Path -LiteralPath $candidatePath) {
      $pickedPath = $candidatePath
      break
    }
  }
  if (-not $pickedPath) { return $false }

  $item = Get-Item -LiteralPath $pickedPath
  $ext = $item.Extension.ToLowerInvariant()
  $mime = if ($ext -eq ".webm") { "video/webm" } elseif ($ext -eq ".mp4") { "video/mp4" } elseif ($ext -eq ".ogv") { "video/ogg" } else { "image/gif" }

  $CatalogItemsRef.Value += [ordered]@{
    key = $key
    labels = [ordered]@{
      he = [string]$Target.labels.he
      en = [string]$Target.labels.en
    }
    file = ("media/animations/{0}" -f $item.Name)
    mime = $mime
    title = "Local cached animation"
    quality = [ordered]@{
      mode = "cached"
      bytes = [int64]$item.Length
      width = 0
      height = 0
      score = 0
    }
    source = [ordered]@{
      provider = "Local cache"
      page = ""
      license = "See previous catalog/source"
      author = "Unknown"
      query = ""
    }
  }

  Write-Host "Reused local file:" $key "->" $item.Name
  return $true
}

$catalogItems = @()
$existingByKey = Load-ExistingCatalogByKey -Path $CatalogFile

foreach ($target in $targets) {
  $picked = $null
  $pickedQuery = ""
  $pickedProvider = ""
  $allCandidates = @()
  $qualityMode = "strict"

  foreach ($q in $target.queries) {
    $results = Get-SearchResults -Query $q
    $wikiCandidates = Get-ValidFileFromResults -Results $results -TitleKeywords $target.titleKeywords -EnforceQuality $true
    foreach ($candidate in $wikiCandidates) {
      $candidate.query = $q
      $allCandidates += $candidate
    }

    $openverseResults = Get-OpenverseResults -Query $q
    $openverseCandidates = Get-ValidFileFromOpenverse -Results $openverseResults -TitleKeywords $target.titleKeywords -EnforceQuality $true
    foreach ($candidate in $openverseCandidates) {
      $candidate.query = $q
      $allCandidates += $candidate
    }
  }

  if ($allCandidates.Count -eq 0 -and $HighQualityOnly) {
    $qualityMode = "fallback"
    foreach ($q in $target.queries) {
      $results = Get-SearchResults -Query $q
      $wikiCandidates = Get-ValidFileFromResults -Results $results -TitleKeywords $target.titleKeywords -EnforceQuality $false
      foreach ($candidate in $wikiCandidates) {
        $candidate.query = $q
        $allCandidates += $candidate
      }

      $openverseResults = Get-OpenverseResults -Query $q
      $openverseCandidates = Get-ValidFileFromOpenverse -Results $openverseResults -TitleKeywords $target.titleKeywords -EnforceQuality $false
      foreach ($candidate in $openverseCandidates) {
        $candidate.query = $q
        $allCandidates += $candidate
      }
    }
  }

  if ($allCandidates.Count -eq 0) {
    $reused = Try-AppendManualFileFallback -Target $target -CatalogItemsRef ([ref]$catalogItems)
    if (-not $reused) {
      $reused = Try-AppendExistingEntry -ExistingByKey $existingByKey -TargetKey $target.key -CatalogItemsRef ([ref]$catalogItems)
    }
    if (-not $reused) {
      $reused = Try-AppendLocalFileFallback -Target $target -CatalogItemsRef ([ref]$catalogItems)
    }
    if (-not $reused) {
      Write-Warning "No animation found for $($target.key)"
    }
    continue
  }

  $sortedCandidates = $allCandidates |
    Sort-Object -Property score -Descending |
    Group-Object -Property url |
    ForEach-Object { $_.Group[0] }

  $downloaded = $false
  foreach ($candidate in $sortedCandidates) {
    $ext = Get-ExtensionFromMime -Mime $candidate.mime -Url $candidate.url
    $fileName = "$($target.key)$ext"
    $outPath = Join-Path $OutDir $fileName
    $ok = Try-DownloadFile -Url $candidate.url -OutPath $outPath
    if (-not $ok) { continue }

    $picked = $candidate
    $pickedQuery = [string]$candidate.query
    $pickedProvider = [string]$candidate.provider
    $downloaded = $true
    break
  }

  if (-not $downloaded -or -not $picked) {
    $reused = Try-AppendManualFileFallback -Target $target -CatalogItemsRef ([ref]$catalogItems)
    if (-not $reused) {
      $reused = Try-AppendExistingEntry -ExistingByKey $existingByKey -TargetKey $target.key -CatalogItemsRef ([ref]$catalogItems)
    }
    if (-not $reused) {
      $reused = Try-AppendLocalFileFallback -Target $target -CatalogItemsRef ([ref]$catalogItems)
    }
    if (-not $reused) {
      Write-Warning "No downloadable animation found for $($target.key)"
    }
    continue
  }

  $catalogItems += [ordered]@{
    key = $target.key
    labels = [ordered]@{
      he = [string]$target.labels.he
      en = [string]$target.labels.en
    }
    file = "media/animations/$fileName"
    mime = [string]$picked.mime
    title = [string]$picked.title
    quality = [ordered]@{
      mode = $qualityMode
      bytes = [int64]$picked.bytes
      width = [int]$picked.width
      height = [int]$picked.height
      score = [int]$picked.score
    }
    source = [ordered]@{
      provider = if ([string]::IsNullOrWhiteSpace($pickedProvider)) { "Wikimedia Commons" } else { $pickedProvider }
      page = [string]$picked.sourcePage
      license = if ([string]::IsNullOrWhiteSpace($picked.license)) { "Unknown" } else { [string]$picked.license }
      author = if ([string]::IsNullOrWhiteSpace($picked.author)) { "Unknown" } else { [string]$picked.author }
      query = $pickedQuery
    }
  }

  Write-Host "Downloaded:" $target.key "->" $fileName "(" $pickedProvider ")"
}

$catalog = [ordered]@{
  generatedAt = (Get-Date).ToString("s")
  provider = "Wikimedia Commons + Openverse"
  highQualityOnly = [bool]$HighQualityOnly
  minBytes = $MinBytes
  minPixels = $MinPixels
  items = $catalogItems
}

$catalog | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $CatalogFile -Encoding UTF8
Write-Host "Animation catalog written:" $CatalogFile "(" $catalogItems.Count "items )"
