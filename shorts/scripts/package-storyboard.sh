#!/usr/bin/env bash
set -euo pipefail

root="${1:-shorts/out/storyboards}"
[[ -d "${root}" ]] || { echo "Storyboard directory not found: ${root}" >&2; exit 1; }

while IFS= read -r -d '' storyboard_dir; do
  mapfile -d '' scenes < <(find "${storyboard_dir}" -maxdepth 1 -type f -name '*-scene-[0-9][0-9].png' -print0 | sort -z)
  [[ "${#scenes[@]}" -gt 0 ]] || continue
  base="$(basename "${storyboard_dir}")"

  montage "${scenes[@]}" \
    -thumbnail '540x960' \
    -tile 2x \
    -geometry +0+0 \
    -background '#050505' \
    -quality 90 \
    "${storyboard_dir}/${base}-contact-sheet.jpg"

  motion_frames=()
  for scene in "${scenes[@]}"; do
    stem="${scene%.png}"
    if [[ -f "${stem}-initial.png" ]]; then
      motion_frames+=("${stem}-initial.png" "${stem}-change.png" "${scene}")
    fi
  done
  if [[ "${#motion_frames[@]}" -gt 0 ]]; then
    montage "${motion_frames[@]}" \
      -thumbnail '360x640' \
      -tile 3x \
      -geometry +8+8 \
      -background '#050505' \
      -quality 90 \
      "${storyboard_dir}/${base}-motion-contact-sheet.jpg"
  fi

  img2pdf "${scenes[@]}" -o "${storyboard_dir}/${base}-storyboard.pdf"
done < <(find "${root}" -mindepth 1 -maxdepth 1 -type d -print0)
