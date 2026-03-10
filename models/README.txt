Place your GLB model file here and rename to open3dmodel.glb

Curated external model sync:
- Run: powershell -ExecutionPolicy Bypass -File tools/download-curated-models.ps1
- Source metadata is written to: models/sources.json
- Regenerate selector catalog: powershell -ExecutionPolicy Bypass -File tools/update-model-manifest.ps1
