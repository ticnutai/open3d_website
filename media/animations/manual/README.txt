Manual animation import

Put your own animation files in this folder.
Supported formats: .webm, .mp4, .ogv, .gif

Recommended naming:
- lymphatic.webm
- urinary.gif
- nervous.webm
- heart.gif
- respiratory.gif
- circulatory.gif
- head.webm

Rules:
- If a manual file exists for a system key, it is preferred as fallback when online download fails.
- Run: ./tools/download-medical-animations.ps1
- For retry with backoff: ./tools/retry-animation-downloads.ps1
