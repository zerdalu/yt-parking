#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

OUTPUT_DIR="voice-overs/captions"
MODEL="${WHISPER_MODEL:-small.en}"
LANGUAGE="${WHISPER_LANGUAGE:-en}"
CAPTION_FORMAT="${WHISPER_CAPTION_FORMAT:-vtt}"
FORCE=false

if [[ "${CAPTION_FORMAT}" != "vtt" && "${CAPTION_FORMAT}" != "srt" ]]; then
  echo "Error: WHISPER_CAPTION_FORMAT must be 'vtt' or 'srt' (got '${CAPTION_FORMAT}')." >&2
  exit 1
fi

if ! command -v whisper >/dev/null 2>&1; then
  echo "Error: 'whisper' command not found. See voice-overs/transcription-setup.md." >&2
  exit 1
fi

if [[ "${1:-}" == "--" ]]; then
  shift
fi

declare -a INPUT_ARGS=()
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --)
      shift
      while [[ "$#" -gt 0 ]]; do
        INPUT_ARGS+=("$1")
        shift
      done
      ;;
    -f|--force)
      FORCE=true
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: voice-overs/transcribe.sh [OPTIONS] [AUDIO_FILE...]

Transcribes voice-over MP3 files into voice-overs/captions/ as:
  - .json (word-level timestamps for animation fine-tuning)
  - .vtt  (WebVTT captions; override with WHISPER_CAPTION_FORMAT=srt)

Already-processed files (where both .json and caption files exist) are skipped.

Options:
  -f, --force    Re-transcribe files even if outputs already exist
  -h, --help     Show this help message
EOF
      exit 0
      ;;
    -*)
      echo "Error: Unknown option '$1'. Run with --help for usage." >&2
      exit 1
      ;;
    *)
      INPUT_ARGS+=("$1")
      shift
      ;;
  esac
done

declare -a AUDIO_FILES=()
if [[ "${#INPUT_ARGS[@]}" -gt 0 ]]; then
  AUDIO_FILES=("${INPUT_ARGS[@]}")
else
  shopt -s nullglob
  AUDIO_FILES=(public/vo-slide-*.mp3)
  shopt -u nullglob
fi

if [[ "${#AUDIO_FILES[@]}" -eq 0 ]]; then
  echo "Error: No audio files found matching public/vo-slide-*.mp3" >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

declare -a PENDING_FILES=()
declare -a PENDING_STEMS=()
skipped_count=0

for audio_file in "${AUDIO_FILES[@]}"; do
  if [[ ! -f "${audio_file}" ]]; then
    echo "Error: Audio file not found: ${audio_file}" >&2
    exit 1
  fi

  filename="$(basename "${audio_file}")"
  stem="${filename%.*}"
  json_out="${OUTPUT_DIR}/${stem}.json"
  caption_out="${OUTPUT_DIR}/${stem}.${CAPTION_FORMAT}"

  already_queued=false
  if [[ "${#PENDING_STEMS[@]}" -gt 0 ]]; then
    for queued_stem in "${PENDING_STEMS[@]}"; do
      if [[ "${queued_stem}" == "${stem}" ]]; then
        already_queued=true
        break
      fi
    done
  fi
  if [[ "${already_queued}" == "true" ]]; then
    continue
  fi

  if [[ "${FORCE}" != "true" && -s "${json_out}" && -s "${caption_out}" ]]; then
    echo "Skipping ${audio_file} (${stem}.json and ${stem}.${CAPTION_FORMAT} already exist)"
    skipped_count=$((skipped_count + 1))
    continue
  fi

  PENDING_FILES+=("${audio_file}")
  PENDING_STEMS+=("${stem}")
done

if [[ "${#PENDING_FILES[@]}" -eq 0 ]]; then
  echo "Nothing to transcribe (${skipped_count} file(s) already processed). Use --force to re-transcribe."
  exit 0
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo "Transcribing ${#PENDING_FILES[@]} file(s) -> .json + .${CAPTION_FORMAT}..."

whisper \
  --model "${MODEL}" \
  --language "${LANGUAGE}" \
  --word_timestamps True \
  --output_format all \
  --output_dir "${TMP_DIR}" \
  "${PENDING_FILES[@]}"

for stem in "${PENDING_STEMS[@]}"; do
  mv -f "${TMP_DIR}/${stem}.json" "${OUTPUT_DIR}/${stem}.json"
  mv -f "${TMP_DIR}/${stem}.${CAPTION_FORMAT}" "${OUTPUT_DIR}/${stem}.${CAPTION_FORMAT}"
done

echo "Done. Wrote ${#PENDING_STEMS[@]} .json and .${CAPTION_FORMAT} pair(s) to ${OUTPUT_DIR}/."
