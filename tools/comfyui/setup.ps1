# Rebuilds the local ComfyUI image stack from pinned versions (see models.json and the pins below).
# Usage:  powershell -ExecutionPolicy Bypass -File tools\comfyui\setup.ps1 [-InstallDir C:\ComfyUI]
# Keep the install on an SSD: the 8 GB Flux model loads on every cold start.
# Re-running is safe: finished steps are skipped, and model files are checked against their SHA-256.
param([string]$InstallDir = "C:\ComfyUI")
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$ComfyVersion = "v0.37.0"
$Nodes = @(
  @{ Name = "ComfyUI-Manager"; Repo = "https://github.com/Comfy-Org/ComfyUI-Manager"; Commit = "9c29dc68a488fd56e15f152807579009d627bfef" },
  @{ Name = "ComfyUI-GGUF";    Repo = "https://github.com/city96/ComfyUI-GGUF";      Commit = "6ea2651e7df66d7585f6ffee804b20e92fb38b8a" }
)

# 1. Portable build (ships its own Python + PyTorch; never use a manual venv for ComfyUI)
if (-not (Test-Path "$InstallDir\python_embeded")) {
  $tmp = Join-Path $env:TEMP "comfyui-setup"
  New-Item -ItemType Directory -Force $tmp | Out-Null
  $archive = "$tmp\ComfyUI_windows_portable_nvidia.7z"
  Write-Host "Downloading ComfyUI portable $ComfyVersion ..."
  Invoke-WebRequest "https://github.com/comfyanonymous/ComfyUI/releases/download/$ComfyVersion/ComfyUI_windows_portable_nvidia.7z" -OutFile $archive
  Invoke-WebRequest "https://www.7-zip.org/a/7zr.exe" -OutFile "$tmp\7zr.exe"
  & "$tmp\7zr.exe" x $archive "-o$tmp\extract" -y | Out-Null
  $root = Get-ChildItem "$tmp\extract" -Directory | Select-Object -First 1
  Move-Item $root.FullName $InstallDir
  Remove-Item $tmp -Recurse -Force
}
$py = "$InstallDir\python_embeded\python.exe"

# 2. Custom nodes at pinned commits
foreach ($n in $Nodes) {
  $dir = "$InstallDir\ComfyUI\custom_nodes\$($n.Name)"
  if (-not (Test-Path $dir)) { git clone $n.Repo $dir }
  git -C $dir fetch --quiet origin
  git -C $dir checkout --quiet $n.Commit
}
& $py -m pip install -r "$PSScriptRoot\requirements.txt"

# 3. Models, verified by SHA-256
$manifest = Get-Content "$PSScriptRoot\models.json" -Raw | ConvertFrom-Json
foreach ($m in $manifest.models) {
  $dest = "$InstallDir\ComfyUI\models\$($m.folder)\$($m.file)"
  if ((Test-Path $dest) -and ((Get-FileHash $dest -Algorithm SHA256).Hash -eq $m.sha256)) {
    Write-Host "ok        $($m.file)"; continue
  }
  Write-Host "download  $($m.file) ($([math]::Round($m.bytes / 1GB, 2)) GB) ..."
  & curl.exe -fL --retry 5 -o $dest $m.url
  if ((Get-FileHash $dest -Algorithm SHA256).Hash -ne $m.sha256) { throw "checksum mismatch: $($m.file)" }
}

# 4. LAN launcher (lets the Mac call this box on port 8188)
Set-Content -Encoding ascii "$InstallDir\run_nvidia_gpu_lan.bat" -Value @"
.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --listen 0.0.0.0 --port 8188
pause
"@

Write-Host "Done. Start ComfyUI with $InstallDir\run_nvidia_gpu_lan.bat"
