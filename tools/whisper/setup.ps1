# Creates the local Whisper env at <repo>/.whisper-env (gitignored) from the pinned lock file.
# Needs Python 3.12 and an NVIDIA GPU. The model (~1.6 GB) downloads to .whisper-env/models on first use.
# av is pinned to 14.x: faster-whisper 1.2.1 calls av.open(metadata_errors=...), which av >= 15 removed.
$ErrorActionPreference = "Stop"
$repo = Resolve-Path "$PSScriptRoot\..\.."
$envDir = Join-Path $repo ".whisper-env"

if (-not (Test-Path $envDir)) { py -3.12 -m venv $envDir }
& "$envDir\Scripts\python.exe" -m pip install --upgrade pip
& "$envDir\Scripts\python.exe" -m pip install --only-binary=:all: -r "$PSScriptRoot\requirements.lock.txt"
