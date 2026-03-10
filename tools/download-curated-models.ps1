Param(
	[string]$ModelsDir = "models",
	[switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ModelsDir)) {
	throw "Models directory not found: $ModelsDir"
}

$items = @(
	@{
		file = "brainstem-khronos.glb"
		url = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb"
		source = "Khronos glTF-Sample-Assets"
		license = "Poser EULA (as listed in model README)"
	},
	@{
		file = "scattering-skull-khronos.glb"
		url = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ScatteringSkull/glTF-Binary/ScatteringSkull.glb"
		source = "Khronos glTF-Sample-Assets"
		license = "CC0 1.0 (per model README)"
	},
	@{
		file = "rigged-figure-khronos.glb"
		url = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RiggedFigure/glTF-Binary/RiggedFigure.glb"
		source = "Khronos glTF-Sample-Assets"
		license = "CC BY 4.0 (per model README)"
	},
	@{
		file = "rigged-simple-khronos.glb"
		url = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RiggedSimple/glTF-Binary/RiggedSimple.glb"
		source = "Khronos glTF-Sample-Assets"
		license = "CC BY 4.0 (per model README)"
	},
	@{
		file = "recursive-skeletons-khronos.glb"
		url = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RecursiveSkeletons/glTF-Binary/RecursiveSkeletons.glb"
		source = "Khronos glTF-Sample-Assets"
		license = "CC BY 4.0 (per model README)"
	},
	@{
		file = "corset-khronos.glb"
		url = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Corset/glTF-Binary/Corset.glb"
		source = "Khronos glTF-Sample-Assets"
		license = "CC0 1.0 (per model README)"
	},
	@{
		file = "cesium-air.glb"
		url = "https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/CesiumAir/Cesium_Air.glb"
		source = "Cesium SampleData"
		license = "See Cesium sample asset terms"
	},
	@{
		file = "cesium-drone.glb"
		url = "https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/CesiumDrone/CesiumDrone.glb"
		source = "Cesium SampleData"
		license = "See Cesium sample asset terms"
	},
	@{
		file = "ground-vehicle.glb"
		url = "https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/GroundVehicle/GroundVehicle.glb"
		source = "Cesium SampleData"
		license = "See Cesium sample asset terms"
	},
	@{
		file = "heart-human-organ3d.glb"
		url = "https://raw.githubusercontent.com/yihalem123/Human-Organ3D/main/models/heart.glb"
		source = "Human-Organ3D (GitHub)"
		license = "MIT License"
	},
	@{
		file = "lungs-human-organ3d.glb"
		url = "https://raw.githubusercontent.com/yihalem123/Human-Organ3D/main/models/lung.glb"
		source = "Human-Organ3D (GitHub)"
		license = "MIT License"
	},
	@{
		file = "kidneys-human-organ3d.glb"
		url = "https://raw.githubusercontent.com/yihalem123/Human-Organ3D/main/models/kidney.glb"
		source = "Human-Organ3D (GitHub)"
		license = "MIT License"
	}
)

$downloaded = @()
$skipped = @()

foreach ($item in $items) {
	$target = Join-Path $ModelsDir $item.file

	if ((-not $Force) -and (Test-Path -LiteralPath $target)) {
		$skipped += $item.file
		continue
	}

	Write-Host "Downloading $($item.file)..."
	Invoke-WebRequest -Uri $item.url -OutFile $target -TimeoutSec 180
	$downloaded += $item.file
}

$sourcesPath = Join-Path $ModelsDir "sources.json"
$sourcesDoc = [ordered]@{
	generatedAt = (Get-Date).ToString("s")
	items = $items
}
$sourcesDoc | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $sourcesPath -Encoding UTF8

Write-Host "Done. Downloaded:" ($downloaded.Count) "Skipped:" ($skipped.Count)
Write-Host "Sources written:" $sourcesPath
