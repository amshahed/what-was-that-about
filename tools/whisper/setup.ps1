# Creates the local Whisper env at <repo>/.whisper-env (gitignored) from the pinned lock file.
# Needs Python 3.12 with the `py` launcher, and an NVIDIA GPU.
# `npm run align` runs tools/whisper/align.py in this env (ALIGN_ENGINE=local, the default).
# The model (~1.6 GB) downloads to .whisper-env/models the first time it runs.
# av is pinned to 14.x: faster-whisper 1.2.1 calls av.open(metadata_errors=...), which av >= 15 removed.
$ErrorActionPreference = "Stop"
$repo = Resolve-Path "$PSScriptRoot\..\.."
$envDir = Join-Path $repo ".whisper-env"

# $ErrorActionPreference does not stop on native-command failures in PowerShell 5.1; check exit codes.
# A plain $args function: arguments such as -fL or -C pass through to the exe unchanged.
function Invoke-Native {
  $exe = $args[0]
  $rest = @($args | Select-Object -Skip 1)
  & $exe @rest
  if ($LASTEXITCODE -ne 0) { throw "$exe $($rest -join ' ') failed (exit $LASTEXITCODE)" }
}

if ((Test-Path $envDir) -and -not (Test-Path "$envDir\Scripts\python.exe")) {
  throw "$envDir exists but has no Scripts\python.exe (broken env). Remove it and run again."
}
if (-not (Test-Path $envDir)) { Invoke-Native py -3.12 -m venv $envDir }
Invoke-Native "$envDir\Scripts\python.exe" -m pip install --upgrade pip
Invoke-Native "$envDir\Scripts\python.exe" -m pip install --only-binary=:all: -r "$PSScriptRoot\requirements.lock.txt"
