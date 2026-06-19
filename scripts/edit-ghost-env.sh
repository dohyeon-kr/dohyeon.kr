#!/usr/bin/env bash
set -euo pipefail

project="${PROJECT:-dohyeon-kr}"
environment="${ENVIRONMENT:-prod}"
target="${1:-secrets/${environment}/ghost.env.enc}"

for tool in sops; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required command: $tool" >&2
    exit 127
  fi
done

age_key="$(./scripts/fetch-sops-age-key.sh "$project" "$environment")"

SOPS_AGE_KEY="$age_key" sops "$target"
