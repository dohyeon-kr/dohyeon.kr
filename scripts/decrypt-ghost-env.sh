#!/usr/bin/env bash
set -euo pipefail

project="${PROJECT:-dohyeon-kr}"
environment="${ENVIRONMENT:-prod}"
input="${1:-secrets/${environment}/ghost.env.enc}"
output="${2:-.env}"

for tool in sops; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required command: $tool" >&2
    exit 127
  fi
done

age_key="$(./scripts/fetch-sops-age-key.sh "$project" "$environment")"

umask 077
tmp_output="$(mktemp "${output}.tmp.XXXXXX")"
trap 'rm -f "$tmp_output"' EXIT

SOPS_AGE_KEY="$age_key" sops -d --input-type dotenv --output-type dotenv "$input" > "$tmp_output"
mv "$tmp_output" "$output"
chmod 600 "$output"
