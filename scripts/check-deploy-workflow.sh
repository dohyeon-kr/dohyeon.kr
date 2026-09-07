#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
workflow="$repo_root/.github/workflows/deploy.yml"
compose="$repo_root/docker-compose.yml"
readme="$repo_root/README.md"
theme_manifest="$repo_root/themes/monoliquid/package.json"
deploy_job="$(sed -n '/^  deploy:/,$p' "$workflow")"

grep -Fq "  group: ghost-production" "$workflow"
grep -Fq "  cancel-in-progress: false" "$workflow"
grep -Fq "permissions:" "$workflow"
grep -Fq "    if: github.ref == 'refs/heads/main' && vars.GHOST_PRODUCTION_MYSQL_READY == 'true'" "$workflow"
[[ "$(grep -Fc "    if: github.ref == 'refs/heads/main'" "$workflow")" == 2 ]]
grep -Fq "          persist-credentials: false" "$workflow"
grep -Fq "          node-version: 24.18.0" "$workflow"
grep -Fq "          corepack prepare pnpm@10.34.0 --activate" "$workflow"
grep -Fq "        run: pnpm install --frozen-lockfile --ignore-scripts" "$workflow"
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
grep -Fq '      deploy_sha: ${{ steps.deploy-revision.outputs.sha }}' "$workflow"
grep -Fq '          remote_line="$(git ls-remote --exit-code origin refs/heads/main)"' "$workflow"
grep -Fq '          printf '\''sha=%s\n'\'' "${deploy_sha}" >> "${GITHUB_OUTPUT}"' "$workflow"

grep -Fq "    runs-on: self-hosted" <<<"$deploy_job"
grep -Fq "    needs: release" <<<"$deploy_job"
grep -Fq "    environment: production" <<<"$deploy_job"
grep -Fq "    permissions: {}" <<<"$deploy_job"
grep -Fq '          DEPLOY_SHA: ${{ needs.release.outputs.deploy_sha }}' <<<"$deploy_job"
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

grep -Fq '    image: ${GHOST_IMAGE:?GHOST_IMAGE must be an exact digest reference}' "$compose"
grep -Fq '    pull_policy: never' "$compose"
grep -Fq '      - no-new-privileges:true' "$compose"
grep -Fq '      - ALL' "$compose"
grep -Fq '    healthcheck:' "$compose"
grep -Fq '    logging:' "$compose"

if grep -Eq '^[[:space:]]+image:[[:space:]]+ghost:[^[:space:]]+' "$compose"; then
  echo "The production Compose file must not use a mutable Ghost tag." >&2
  exit 1
fi

grep -Fxq -- '- Ghost 6.51.0 Alpine 3.23 Docker image selected by an exact local digest' "$readme"
grep -Fxq 'docker pull ghost:6.51.0-alpine3.23' "$readme"
grep -Fxq 'export GHOST_IMAGE="$(docker image inspect --format '\''{{index .RepoDigests 0}}'\'' ghost:6.51.0-alpine3.23)"' "$readme"

if grep -Eqi 'Ghost[[:space:]]+5|ghost:5([.-]|[[:space:]]|$)' "$readme"; then
  echo "Ghost 5 is end-of-life and must not return to the documented stack." >&2
  exit 1
fi

theme_ghost_engine="$(node -e '
const fs = require("node:fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
process.stdout.write(manifest.engines?.ghost ?? "");
' "$theme_manifest")"

if [[ "$theme_ghost_engine" != ">=6.0.0 <7.0.0" ]]; then
  echo "The Ghost theme must support only Ghost 6.x." >&2
  exit 1
fi
