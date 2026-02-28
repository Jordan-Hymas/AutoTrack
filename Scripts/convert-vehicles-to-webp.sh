#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${1:-"$ROOT_DIR/Vehicles"}"
OUT_DIR="${2:-"$ROOT_DIR/public/vehicles"}"
QUALITY="${QUALITY:-82}"
CANVAS_WIDTH="${CANVAS_WIDTH:-1200}"
CANVAS_HEIGHT="${CANVAS_HEIGHT:-360}"
IMAGE_BOX_WIDTH="${IMAGE_BOX_WIDTH:-980}"
IMAGE_BOX_HEIGHT="${IMAGE_BOX_HEIGHT:-320}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg is required but was not found in PATH."
  exit 1
fi

mkdir -p "$OUT_DIR"
shopt -s nullglob

converted=0
skipped=0

detect_crop() {
  local input="$1"
  local crop

  crop="$(
    ffmpeg -hide_banner -loglevel info \
      -i "$input" \
      -vf "alphaextract,cropdetect=0.1:2:0" \
      -frames:v 1 \
      -f null - 2>&1 |
      awk -F'crop=' '/crop=/{print $2}' |
      awk '{print $1}' |
      tail -n 1
  )"

  if [[ -z "$crop" ]]; then
    crop="$(
      ffmpeg -hide_banner -loglevel info \
        -i "$input" \
        -vf "cropdetect=24:16:0" \
        -frames:v 1 \
        -f null - 2>&1 |
        awk -F'crop=' '/crop=/{print $2}' |
        awk '{print $1}' |
        tail -n 1
    )"
  fi

  if [[ -z "$crop" ]]; then
    echo "iw:ih:0:0"
    return 0
  fi

  echo "$crop"
}

for input in "$SRC_DIR"/*; do
  [[ -f "$input" ]] || continue

  filename="$(basename "$input")"
  extension="${filename##*.}"
  extension="$(printf '%s' "$extension" | tr '[:upper:]' '[:lower:]')"

  case "$extension" in
    png|jpg|jpeg|avif)
      output="$OUT_DIR/${filename%.*}.webp"
      crop_value="$(detect_crop "$input")"
      ffmpeg -y -loglevel error \
        -i "$input" \
        -vf "crop=${crop_value},scale=${IMAGE_BOX_WIDTH}:${IMAGE_BOX_HEIGHT}:force_original_aspect_ratio=decrease,pad=${CANVAS_WIDTH}:${CANVAS_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x00000000" \
        -vcodec libwebp \
        -q:v "$QUALITY" \
        -compression_level 6 \
        -preset picture \
        -pix_fmt yuva420p \
        -frames:v 1 \
        "$output"
      echo "Converted: $filename -> $(basename "$output")"
      converted=$((converted + 1))
      ;;
    *)
      echo "Skipped: $filename"
      skipped=$((skipped + 1))
      ;;
  esac
done

echo "Done. Converted $converted file(s), skipped $skipped file(s)."
