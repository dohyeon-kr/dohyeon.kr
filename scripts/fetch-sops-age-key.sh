#!/usr/bin/env bash
set -euo pipefail

project="${1:-}"
environment="${2:-prod}"
vault_path="${VAULT_SOPS_KEY_PATH:-kv/sops/${project}/${environment}}"
vault_field="${VAULT_SOPS_KEY_FIELD:-age_key}"

if [[ -z "$project" ]]; then
  echo "Usage: $0 <project> [environment]" >&2
  exit 64
fi

if ! command -v vault >/dev/null 2>&1; then
  echo "Missing required command: vault" >&2
  exit 127
fi

age_key="$(vault kv get -field="$vault_field" "$vault_path")"
if [[ -z "$age_key" ]]; then
  echo "Vault returned an empty SOPS age key from $vault_path field $vault_field" >&2
  exit 1
fi

printf '%s\n' "$age_key"
