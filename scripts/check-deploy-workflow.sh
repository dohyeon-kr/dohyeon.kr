#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
workflow="$repo_root/.github/workflows/deploy.yml"
deploy_job="$(sed -n '/^  deploy:/,$p' "$workflow")"

grep -Fq "  group: ghost-production" "$workflow"
grep -Fq "  cancel-in-progress: false" "$workflow"
grep -Fq "permissions:" "$workflow"
grep -Fq "      contents: write" "$workflow"
if grep -Eq '^  (contents: write|id-token: write)$' "$workflow"; then
  echo "Write and OIDC permissions must be scoped to the job that needs them." >&2
  exit 1
fi
grep -Fxq "        run: pnpm semantic-release" "$workflow"
if grep -Eq 'semantic-release.*\|\|' "$workflow"; then
  echo "Semantic Release failures must stop deployment." >&2
  exit 1
fi

grep -Fq "    runs-on: self-hosted" <<<"$deploy_job"
grep -Fq "    needs: release" <<<"$deploy_job"
grep -Fq "    environment: production" <<<"$deploy_job"
grep -Fq "    permissions: {}" <<<"$deploy_job"
grep -Fq '          DEPLOY_SHA: ${{ github.sha }}' <<<"$deploy_job"
grep -Fxq '        run: sudo /usr/local/sbin/deploy-ghost-blog "$DEPLOY_SHA"' <<<"$deploy_job"

if grep -Eqi '^[[:space:]]+uses:|actions/checkout|vault-action|sops|GITHUB_WORKSPACE|id-token|contents:|\$\{\{[[:space:]]*(secrets|vars)\.' <<<"$deploy_job"; then
  echo "The self-hosted deploy job may pass only github.sha to the root wrapper." >&2
  exit 1
fi

if [[ "$(grep -Ec '^      - name:' <<<"$deploy_job")" != 1 ]] || \
  [[ "$(grep -Ec '^        run:' <<<"$deploy_job")" != 1 ]]; then
  echo "The self-hosted deploy job must contain only the SHA deployment step." >&2
  exit 1
fi
