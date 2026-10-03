# Rebuilds the local ComfyUI image stack from pinned versions (see models.json and the pins below).
# Usage:  powershell -ExecutionPolicy Bypass -File tools\comfyui\setup.ps1 [-InstallDir C:\ComfyUI]
# Keep the install on an SSD: the 8 GB Flux model loads on every cold start.
# Re-running is safe: finished steps are skipped, model files are checked against their SHA-256,
# and an interrupted model download resumes.
param([string]$InstallDir = "C:\ComfyUI")
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$InstallDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallDir)

$ComfyVersion = "0.37.0"
$Nodes = @(
  @{ Name = "ComfyUI-Manager"; Repo = "https://github.com/Comfy-Org/ComfyUI-Manager"; Commit = "9c29dc68a488fd56e15f152807579009d627bfef" },
  @{ Name = "ComfyUI-GGUF";    Repo = "https://github.com/city96/ComfyUI-GGUF";      Commit = "6ea2651e7df66d7585f6ffee804b20e92fb38b8a" }
)

# $ErrorActionPreference does not stop on native-command failures in PowerShell 5.1; check exit codes.
# A plain $args function: arguments such as -fL or -C pass through to the exe unchanged.
function Invoke-Native {
  $exe = $args[0]
  $rest = @($args | Select-Object -Skip 1)
  & $exe @rest
  if ($LASTEXITCODE -ne 0) { throw "$exe $($rest -join ' ') failed (exit $LASTEXITCODE)" }
}

# 1. Portable build (ships its own Python + PyTorch; never use a manual venv for ComfyUI)
if (-not (Test-Path "$InstallDir\python_embeded")) {
  if (Test-Path $InstallDir) {
    throw "$InstallDir exists but has no python_embeded (interrupted install?). Remove it and run again."
  }
  # Extract on the same drive as the target: PowerShell 5.1 cannot move folders across drives.
  $parent = Split-Path $InstallDir -Parent
  $tmp = Join-Path $parent "comfyui-setup-tmp"
  New-Item -ItemType Directory -Force $tmp | Out-Null
  $archive = "$tmp\ComfyUI_windows_portable_nvidia.7z"
  Write-Host "Downloading ComfyUI portable v$ComfyVersion ..."
  Invoke-Native curl.exe -fL --retry 5 -C - -o $archive "https://github.com/comfyanonymous/ComfyUI/releases/download/v$ComfyVersion/ComfyUI_windows_portable_nvidia.7z"
  Invoke-Native curl.exe -fL --retry 5 -o "$tmp\7zr.exe" "https://www.7-zip.org/a/7zr.exe"
  try {
    Invoke-Native "$tmp\7zr.exe" x $archive "-o$tmp\extract" -y | Out-Null
  } catch {
    # A corrupt archive would fail every re-run; remove it so the next run downloads it again.
    Remove-Item $archive, "$tmp\extract" -Recurse -Force -ErrorAction SilentlyContinue
    throw
  }
  $root = Get-ChildItem "$tmp\extract" -Directory | Select-Object -First 1
  if ($null -eq $root -or -not (Test-Path "$($root.FullName)\python_embeded")) {
    throw "Unexpected archive layout in $tmp\extract"
  }
  Move-Item $root.FullName $InstallDir
  Remove-Item $tmp -Recurse -Force
}
$py = "$InstallDir\python_embeded\python.exe"

$versionFile = "$InstallDir\ComfyUI\comfyui_version.py"
$match = if (Test-Path $versionFile) { Select-String -Path $versionFile -Pattern '__version__ = "(.+)"' } else { $null }
$installed = if ($match) { $match.Matches[0].Groups[1].Value } else { "unknown" }
if ($installed -ne $ComfyVersion) {
  Write-Warning "Installed ComfyUI is $installed; this recipe pins $ComfyVersion."
}

# 2. Custom nodes at pinned commits, then their pinned pip packages
foreach ($n in $Nodes) {
  $dir = "$InstallDir\ComfyUI\custom_nodes\$($n.Name)"
  if (-not (Test-Path $dir)) { Invoke-Native git clone $n.Repo $dir }
  Invoke-Native git -C $dir fetch --quiet origin
  Invoke-Native git -C $dir checkout --quiet $n.Commit
}
Invoke-Native $py -m pip install -r "$PSScriptRoot\requirements.txt"

# 3. Models, verified by SHA-256. Downloads go to <file>.part first and resume if interrupted.
$manifest = Get-Content "$PSScriptRoot\models.json" -Raw | ConvertFrom-Json
foreach ($m in $manifest.models) {
  $dest = "$InstallDir\ComfyUI\models\$($m.folder)\$($m.file)"
  if ((Test-Path $dest) -and ((Get-FileHash $dest -Algorithm SHA256).Hash -eq $m.sha256)) {
    Write-Host "ok        $($m.file)"; continue
  }
  Write-Host "download  $($m.file) ($([math]::Round($m.bytes / 1GB, 2)) GB) ..."
  $part = "$dest.part"
  Invoke-Native curl.exe -fL --retry 5 -C - --create-dirs -o $part $m.url
  if ((Get-FileHash $part -Algorithm SHA256).Hash -ne $m.sha256) {
    Remove-Item $part
    throw "checksum mismatch: $($m.file) (partial file removed; run again)"
  }
  Move-Item -Force $part $dest
}

# 4. LAN launcher (lets the Mac call this box on port 8188). cd to the .bat's folder so it runs from anywhere.
# Set-Content writes each array item with CRLF, as cmd expects.
Set-Content -Encoding ascii "$InstallDir\run_nvidia_gpu_lan.bat" -Value @(
  'cd /d "%~dp0"',
  '.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --listen 0.0.0.0 --port 8188',
  'pause'
)

Write-Host "Done. Start ComfyUI with $InstallDir\run_nvidia_gpu_lan.bat"
