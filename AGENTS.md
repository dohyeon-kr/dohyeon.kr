# Agent Notes

## Release Commit Messages

This repository uses `semantic-release` with the default conventional commit
analyzer. Deployment can run without a GitHub Release, but a new release is only
created when at least one commit since the previous tag has a release-triggering
commit header.

Use Conventional Commits for any change that should create a release:

- `fix: ...` for a patch release.
- `feat: ...` for a minor release.
- `feat!: ...`, `fix!: ...`, or a `BREAKING CHANGE:` footer for a major release.

Do not rely on a PR title alone. If GitHub creates a merge commit like
`Merge pull request #...`, semantic-release may analyze that merge header and the
branch commits; non-conventional branch commits such as `Restore branded Resend
sender` will not trigger a release.

When preparing a release-relevant PR, make sure the actual commit message first
line is conventional, for example:

```text
fix: restore branded Resend sender
```

For documentation-only or maintenance changes that should not publish a release,
use non-release types such as `docs:` or `chore:`.

## Deployment And Secrets

The Ghost deployment workflow is split by trust boundary:

- The `release` job runs on `ubuntu-latest`.
- The `deploy` job runs on the self-hosted runner.
- GitHub Actions must not depend on repository or organization secrets for the
  Ghost SOPS key. The deploy job authenticates to Vault with GitHub OIDC and
  reads `SOPS_AGE_KEY` from `kv/sops/dohyeon-kr`.
- Do not reintroduce `/home/dohyeon/.config/sops/age/keys.txt`; the local age
  key file was removed after the Vault migration.
- The self-hosted runner should not directly run privileged deployment steps
  such as `sudo cp`, `sudo systemctl`, `docker compose`, or writes under
  `/etc/nginx` and `/var/www`.
- Deployment from GitHub Actions must go through the restricted wrapper:

```sh
sudo /usr/local/sbin/deploy-ghost-blog "$GITHUB_WORKSPACE"
```

The runner sudo allowlist is intentionally narrow. For this repository, assume
only these wrappers are allowed:

```text
/usr/local/sbin/deploy-ghost-blog
/usr/local/sbin/deploy-meal-planner
```

If deployment behavior needs to change, update the server wrapper and sudoers
configuration deliberately instead of expanding privileged commands inline in
`.github/workflows/deploy.yml`.
