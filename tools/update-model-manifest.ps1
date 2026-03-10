Param(
  [string]$ModelsDir = "models",
  [string]$OutFile = "models/manifest.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ModelsDir)) {
  throw "Models directory not found: $ModelsDir"
}

function Convert-ToLabel {
  param([string]$BaseName)
  $text = $BaseName -replace "[-_]+", " "
  $text = ($text -split "\s+") | ForEach-Object {
    if ($_.Length -eq 0) { $_ }
    elseif ($_.Length -eq 1) { $_.ToUpper() }
    else { $_.Substring(0,1).ToUpper() + $_.Substring(1) }
  }
  ($text -join " ").Trim()
}

$FriendlyLabels = @{
  "open3dmodel" = @{ he = "מודל אנטומי מלא"; en = "Open3DModel Full" }
  "upper-limb" = @{ he = "גפה עליונה"; en = "Upper Limb" }
  "lower-limb" = @{ he = "גפה תחתונה"; en = "Lower Limb" }
  "overview-skeleton" = @{ he = "שלד כללי"; en = "Overview Skeleton" }
  "overview-colored-skull" = @{ he = "גולגולת צבעונית"; en = "Overview Colored Skull" }
  "colored-skull-base" = @{ he = "בסיס גולגולת צבעוני"; en = "Colored Skull Base" }
  "exploded-skull" = @{ he = "גולגולת מפורקת"; en = "Exploded Skull" }
  "hand" = @{ he = "כף יד"; en = "Hand" }
  "vertebrae" = @{ he = "חוליות"; en = "Vertebrae" }
  "brainstem-khronos" = @{ he = "גזע המוח (Khronos)"; en = "Brainstem (Khronos)" }
  "scattering-skull-khronos" = @{ he = "גולגולת פיזור אור (Khronos)"; en = "Scattering Skull (Khronos)" }
  "fox-khronos" = @{ he = "שועל (Khronos)"; en = "Fox (Khronos)" }
  "cesiumman-khronos" = @{ he = "אדם הדגמה (Khronos)"; en = "Cesium Man (Khronos)" }
  "damaged-helmet-khronos" = @{ he = "קסדה פגומה (Khronos)"; en = "Damaged Helmet (Khronos)" }
  "rigged-figure-khronos" = @{ he = "דמות ממורגת (Khronos)"; en = "Rigged Figure (Khronos)" }
  "rigged-simple-khronos" = @{ he = "ריג פשוט (Khronos)"; en = "Rigged Simple (Khronos)" }
  "recursive-skeletons-khronos" = @{ he = "שלדים רקורסיביים (Khronos)"; en = "Recursive Skeletons (Khronos)" }
  "corset-khronos" = @{ he = "דגם מחוך (Khronos)"; en = "Corset (Khronos)" }
  "cesium-air" = @{ he = "מטוס Cesium"; en = "Cesium Air" }
  "cesium-drone" = @{ he = "רחפן Cesium"; en = "Cesium Drone" }
  "ground-vehicle" = @{ he = "רכב קרקעי"; en = "Ground Vehicle" }
  "heart-human-organ3d" = @{ he = "לב"; en = "Heart" }
  "lungs-human-organ3d" = @{ he = "ריאות"; en = "Lungs" }
  "kidneys-human-organ3d" = @{ he = "כליות"; en = "Kidneys" }
}

function Get-ManifestLabels {
  param([string]$Key)

  if ($FriendlyLabels.ContainsKey($Key)) {
    return $FriendlyLabels[$Key]
  }

  $fallback = Convert-ToLabel -BaseName $Key
  return @{ he = $fallback; en = $fallback }
}

$glbFiles = Get-ChildItem -LiteralPath $ModelsDir -Filter *.glb -File | Sort-Object Name

$models = foreach ($file in $glbFiles) {
  $key = [System.IO.Path]::GetFileNameWithoutExtension($file.Name).ToLower()
  $labels = Get-ManifestLabels -Key $key
  [ordered]@{
    key = $key
    path = ("models/{0}" -f $file.Name)
    labels = [ordered]@{
      he = $labels.he
      en = $labels.en
    }
    mirror = $false
  }
}

$manifest = [ordered]@{
  generatedAt = (Get-Date).ToString("s")
  models = $models
}

$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutFile -Encoding UTF8
Write-Host "Manifest written:" $OutFile "(" $models.Count "models )"
