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
