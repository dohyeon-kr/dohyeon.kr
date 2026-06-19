#!/usr/bin/env bash
set -euo pipefail

age_private_pattern="AGE-SECRET""-KEY-"
vault_token_pattern="hv""[bs]\\.[A-Za-z0-9_-]+"

if grep -R --line-number --exclude-dir=.git "$age_private_pattern" .; then
  echo "Found an age private key. Remove it before committing." >&2
  exit 1
fi

if grep -R -E --line-number --exclude-dir=.git "$vault_token_pattern" .; then
  echo "Found a possible Vault token. Remove it before committing." >&2
  exit 1
fi
