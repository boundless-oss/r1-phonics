#!/usr/bin/env bash
# Normalize + trim + mp3-encode raw voice recordings for r1-phonics.
#
# Usage:
#   scripts/trim-audio.sh <raw-dir>
#
# Conventions:
#   Input files must be named <category>-<slug>.<ext>
#     e.g. letters-s.m4a  → public/assets/audio/letters/s.mp3
#     e.g. praise-tried-1.m4a → public/assets/audio/praise/tried-1.mp3
#   Accepted extensions: m4a, mp3, wav, aac, mp4, ogg, flac.
#
# Output pipeline (ffmpeg):
#   1. Strip leading silence (<40dB, >50ms)
#   2. Reverse, strip leading again (= original trailing), reverse back
#   3. Loudness-normalize to -18 LUFS (matches calm-companion volume target)
#   4. Downmix to mono, resample 44.1 kHz, encode MP3 @ 64 kbps CBR
#
# Requires: ffmpeg (brew install ffmpeg)

set -euo pipefail

RAW="${1:?usage: $0 <raw-dir>}"
OUT_ROOT="$(cd "$(dirname "$0")/.." && pwd)/public/assets/audio"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "error: ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

if [ ! -d "$RAW" ]; then
  echo "error: raw directory not found: $RAW" >&2
  exit 1
fi

processed=0
skipped=0

shopt -s nullglob nocaseglob
for src in "$RAW"/*.{m4a,mp3,wav,aac,mp4,ogg,flac}; do
  [ -f "$src" ] || continue
  base="$(basename "$src")"
  name="${base%.*}"

  category="${name%%-*}"
  slug="${name#*-}"

  if [ "$category" = "$name" ] || [ -z "$slug" ]; then
    echo "skip: $base (expected <category>-<slug>.<ext>)"
    skipped=$((skipped + 1))
    continue
  fi

  dst_dir="$OUT_ROOT/$category"
  mkdir -p "$dst_dir"
  dst="$dst_dir/$slug.mp3"

  printf '  %-28s → %s\n' "$base" "${dst#$OUT_ROOT/}"

  ffmpeg -y -loglevel error -i "$src" \
    -af "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,areverse,loudnorm=I=-18:TP=-1.5:LRA=11" \
    -ac 1 -ar 44100 -c:a libmp3lame -b:a 64k \
    "$dst"

  processed=$((processed + 1))
done

echo
echo "Processed: $processed  |  Skipped: $skipped  |  Output: $OUT_ROOT"
