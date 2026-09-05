#!/usr/bin/env bash
set -euo pipefail

asset_dir="${1:?Usage: publish-video-release.sh <asset-directory>}"
: "${SOURCE_RUN_ID:?SOURCE_RUN_ID is required}"
: "${SOURCE_SHA:?SOURCE_SHA is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
[[ "${SOURCE_RUN_ID}" =~ ^[0-9]+$ ]] || { echo 'Invalid run ID' >&2; exit 1; }
[[ "${SOURCE_SHA}" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid source SHA' >&2; exit 1; }

mapfile -d '' assets < <(find "${asset_dir}" -maxdepth 1 -type f \
  \( -name '*.mp4' -o -name '*.srt' -o -name '*-MEDIA.md' -o -name '*-BGM.md' -o -name '*-REELS.txt' -o -name '*-SCRIPT.txt' \) -print0 | sort -z)
mapfile -d '' videos < <(find "${asset_dir}" -maxdepth 1 -type f -name '*.mp4' -print0 | sort -z)
[[ "${#videos[@]}" -gt 0 ]] || { echo 'No rendered MP4 found' >&2; exit 1; }

tag="shorts-video-${SOURCE_RUN_ID}"
notes="${RUNNER_TEMP:-/tmp}/shorts-video-${SOURCE_RUN_ID}.md"
{
  echo '# 완성된 숏츠 다운로드'
  echo
  echo '아래 Assets에서 MP4를 눌러 영상을 다운로드하세요. ZIP 압축 해제 없이 개별 파일을 받을 수 있습니다.'
  echo
  echo 'SRT 자막, 대본, 게시 문구와 미디어/BGM 출처 파일도 함께 첨부합니다.'
  echo
  printf '[원본 렌더 실행](https://github.com/%s/actions/runs/%s) · [원본 커밋](https://github.com/%s/commit/%s)\n' "${GITHUB_REPOSITORY}" "${SOURCE_RUN_ID}" "${GITHUB_REPOSITORY}" "${SOURCE_SHA}"
} > "${notes}"

if gh release view "${tag}" --repo "${GITHUB_REPOSITORY}" >/dev/null 2>&1; then
  gh release upload "${tag}" "${assets[@]}" --repo "${GITHUB_REPOSITORY}" --clobber
else
  gh release create "${tag}" "${assets[@]}" \
    --repo "${GITHUB_REPOSITORY}" --target "${SOURCE_SHA}" \
    --title "Shorts video · ${SOURCE_RUN_ID}" --notes-file "${notes}" --draft
fi
release_url="$(gh release view "${tag}" --repo "${GITHUB_REPOSITORY}" --json url --jq .url)"
printf '\n## 완성된 숏츠\n\n[Release에서 영상 다운로드](%s)\n' "${release_url}" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
