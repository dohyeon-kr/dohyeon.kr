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

## Blog writing voice

Before drafting, rewriting, proofreading, or polishing any blog post, read
[the canonical author voice guide](docs/writing/voice.md) first and treat it as
the primary style reference.

- Use the author's pre-April-2026 posts as the canonical voice samples described
  in that guide.
- Preserve the visible process by which a thought develops, gets challenged, and
  reaches a current judgment. Do not flatten the post into a generic
  `claim -> evidence -> conclusion` structure merely to make it look cleaner.
- Do not remove first-person experience, repeated ordinary conjunctions,
  conditional reasoning, self-correction, or quoted concept words simply because
  they look less polished.
- Correct factual errors, clear grammatical mistakes, spelling, and spacing, but
  keep stylistic correction separate from language correction.
- Avoid turning posts into report prose, press-release prose, consulting prose,
  or generic AI-polished Korean.
- If another writing policy conflicts only on stylistic smoothness, this voice
  guide takes priority for blog prose. Factual accuracy, safety, and explicit
  user instructions still take priority over style.

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

## Shorts narration voice

Before generating, reviewing, or manually rewriting shorts narration, read
[the shorts narration style policy](shorts/docs/narration-style.md). It is the
canonical voice policy for reels/shorts and takes precedence over the blog voice
for narration structure and sentence style.

- Shorts are informational content. Keep the author's viewpoint and important
  vocabulary, but do not copy the blog's long visible thinking process, repeated
  self-correction, or deliberately loose paragraph rhythm into narration.
- Build a complete arc: `problem/question -> context/cause -> evidence/contrast ->
  insight/turn -> explicit conclusion`. Do not jump from the hook straight to the
  final claim when the source contains enough material to build the argument.
- The final body scene must answer or recover the opening question/key phrase.
  CTA is separate and must not substitute for a conclusion.
- Apply the Korean naturalization rules adapted from `dotoricode/korean-humanizer`:
  remove empty intensifiers/adjectives, translation-like formalism, filler
  connectives, passive/hidden agents, forced triplets, excessive hedging, and
  generic AI vocabulary when a more concrete phrase is available. Preserve facts,
  numbers, proper nouns, quotations, conditions, and information density.
- Keep narration as natural spoken Korean. Default to a consistent
  `~합니다 / ~입니다` register unless an approved candidate intentionally uses a
  different register. Do not mix endings merely for variation.
- Generation code must keep the same rules in its structured editorial policy;
  documentation-only compliance is not sufficient.

## Shorts Korean Typography

For shorts generation, diagram layout, underline effects, or motion changes, follow
[the Korean spacing and overlap rules](shorts/docs/creative-system.md#한글-간격과-겹침-방지).
Keep the generation prompt aligned with that policy. Verify actual Korean text,
including descenders, multiline labels, connection lines, and intermediate motion
frames; a representative still alone is not sufficient evidence of no overlap.

## Shorts visual edits

Before generating or manually editing any shorts candidate, read the photo/full-bleed selection and revision checklist in [creative-system.md](shorts/docs/creative-system.md). Apply it to copied scenes as well as new scenes. Keep the generation prompt aligned. A narration-only edit is incomplete until visual choices, resolved photos, and generated review Markdown have been rechecked. Report actual render verification separately from manifest validation.

## Shared shorts prompts and execution

For any shorts generation or revision, first read [the shared prompt entrypoint](shorts/prompts/README.md)
and run `node shorts/scripts/export-prompts.mjs` to read the same resolved instructions used by the API workflows.
Edit the canonical files under `shorts/prompts/`; do not duplicate prompts in workflow YAML or JS strings.
Default flow: Codex creates/revises candidate JSON → unpaid preview → user feedback → repeat preview →
explicit final approval → final render with cached TTS and alignment. Do not dispatch paid generation/review
as a substitute for a request to create or edit content here. Paid API fallback requires explicit user intent.
No image-generation API calls in shorts workflows; stock photos and deterministic diagram rendering remain available.

## Shorts review documents

Show only authored body scenes in script/storyboard review Markdown and page counts.
Omit common pages marked with `commonPage` (including the shared blog CTA); do not
ask the user to review the same common ending for every candidate. Preserve the
body conclusion. Keep the shared CTA assembly in the final render pipeline.

## Notebook SVG assets and animation

For notebook UI visuals, follow [the SVG style and motion protocol](shorts/docs/notebook-ui-motion.md). Use animated scribble outlines by default, keep labels sharp, and draw arrows tail-first followed by each head stroke. Update actual scene.uiMotion tracks and generated review Markdown together. Preserve static explanatory diagrams where useful.

## Instruction-to-UI Leakage

Before generating, reviewing, or editing any user-facing interface or rendered visual that contains copy, read [the Instruction-to-UI Leakage prevention guide](docs/ui/instruction-to-ui-leakage.md).

- Treat requirements, design criteria, implementation notes, developer notes, and AI instructions as internal input, not as candidate UI copy.
- Convert instructions through `instruction -> user need -> UI element -> copy`; do not copy requirement prose into the rendered interface.
- Prefer the user's mental model over implementation terminology. Translate errors and system states into user-relevant state and next actions.
- Before final render, perform an Instruction Leakage Review over headings, labels, buttons, captions, tooltips, empty states, errors, placeholders, and other visible text.
- Classify visible copy as `USER`, `INTERNAL`, or `AMBIGUOUS`. Only `USER` copy may remain unchanged; rewrite `AMBIGUOUS` from the user's perspective and remove or relocate `INTERNAL` copy.
- Specifically guard against Spec-to-Copy Leakage, Implementation Narration, Developer-Note Leakage, Criteria-to-Copy Leakage, and Debug/Metadata Leakage.
