# Voice-Over Transcription Setup (Debian 13 + CUDA)

This document records the local Whisper transcription setup used to extract phrase and word-level timestamps from the ElevenLabs voice-over MP3 files (`public/vo-slide-*.mp3`) into `voice-overs/captions/`.

## Environment

- **OS:** Debian 13 (`trixie`, amd64)
- **Python:** `3.13.5` (PEP 668 externally-managed system Python, isolated via `pipx 1.7.1`)
- **Whisper Package:** `openai-whisper` (`20250625`)
- **GPU:** NVIDIA GeForce GTX 1050 (Pascal, Compute Capability `6.1`)
- **NVIDIA Driver CUDA Version:** `12040` (`12.4`)

## 1. Install `pipx` and `openai-whisper`

Because Debian 13 restricts direct global `pip install` into the system Python environment, install `pipx` via `apt` and install `openai-whisper` into an isolated environment:

```bash
sudo apt install -y pipx
pipx install openai-whisper
```

## 2. Enable CUDA on Older NVIDIA Drivers / Pascal GPUs

The default PyTorch wheel (`torch 2.15.0`) installed with `openai-whisper` requires a newer NVIDIA driver than driver CUDA interface `12040`, causing PyTorch to fall back to CPU FP32 inference:

```text
UserWarning: CUDA initialization: The NVIDIA driver on your system is too old (found version 12040).
UserWarning: FP16 is not supported on CPU; using FP32 instead
```

To restore GPU acceleration on the GTX 1050 without upgrading the system driver, reinstall PyTorch `2.7.1` built for CUDA `11.8` (`cu118`) inside the `openai-whisper` `pipx` virtualenv:

```bash
pipx runpip openai-whisper install \
  --force-reinstall \
  torch==2.7.1 \
  --index-url https://download.pytorch.org/whl/cu118
```

> **Note:** Running `pipx upgrade openai-whisper` in the future may overwrite `torch` with a newer CUDA build. If CUDA fails to initialize after an upgrade, re-run the `pipx runpip` command above.

## 3. Verify GPU Acceleration

Verify that PyTorch inside the `pipx` environment detects CUDA and runs tensor operations on `cuda:0`:

```bash
~/.local/share/pipx/venvs/openai-whisper/bin/python - <<'PY'
import torch

print("PyTorch:", torch.__version__)
print("CUDA runtime:", torch.version.cuda)
print("CUDA available:", torch.cuda.is_available())

if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
    print("GPU capability:", torch.cuda.get_device_capability(0))

    x = torch.randn(1024, 1024, device="cuda")
    y = x @ x

    print("GPU computation successful!")
    print("Result device:", y.device)
PY
```

Expected output:

```text
PyTorch: 2.7.1+cu118
CUDA runtime: 11.8
CUDA available: True
GPU: NVIDIA GeForce GTX 1050
GPU capability: (6, 1)
GPU computation successful!
Result device: cuda:0
```

## 4. Transcribing Voice-Over Audio

Transcription is handled by `voice-overs/transcribe.sh` and exposed through `package.json`. Already-processed files (where both `.json` and `.vtt` exist in `voice-overs/captions/`) are skipped automatically:

```bash
# Transcribe only new public/vo-slide-*.mp3 files
pnpm run transcribe

# Transcribe only specific audio file(s)
pnpm run transcribe public/vo-slide-04.mp3

# Force re-transcription of an updated audio file
pnpm run transcribe -- --force public/vo-slide-01.mp3

# Override caption format if needed (vtt or srt)
WHISPER_CAPTION_FORMAT=srt pnpm run transcribe
```

### Default Script Options (`voice-overs/transcribe.sh`)

- `--model small.en`: Downloads the 461 MiB English-only `small.en` model on first run and caches it locally (override with `WHISPER_MODEL`).
- `--language en`: Skips language auto-detection for faster, consistent English transcription (override with `WHISPER_LANGUAGE`).
- `--word_timestamps True`: Emits exact `start`, `end`, and `probability` values per spoken word inside `.json`.
- **Exports `.json` + `.vtt` only**: Runs Whisper once in a temporary directory and keeps `.json` (for word-level animation fine-tuning) and `.vtt` captions (override caption format with `WHISPER_CAPTION_FORMAT=srt`).
- `--output_dir voice-overs/captions`: Writes generated `.json` and `.vtt` files under `voice-overs/captions/`.
