# Signup continuous UI — candidate 02

## Style Prompt
Preserve Aurora Explain's near-black, cyan and mint identity and Pretendard typography. Make the phone-number field the persistent protagonist. One large signup surface grows downward; its edge may bleed beyond the screen during camera pushes, while all meaningful labels remain readable. No floating diagram nodes, travelling particles, tiny checklists, permanent large headlines or empty state transitions. This is a locally rendered review candidate, not a published release.

## Colors
- #020205: canvas (original Aurora token)
- #080914: surface (original Aurora token)
- #f7f8ff: text (original Aurora token)
- #54dcff: active/input focus (original Aurora token)
- #5de8c8: success (original Aurora token)
- #ff6b82: readable validation error
- #b4bbce: secondary labels, brightened from original muted token

## Typography
Local Pretendard Variable. Phone value 54px, field labels 36px, supporting labels 26–32px, captions 52px, chapter title 64px. Korean line-height >= 1.3, captions <= two lines. UI labels use natural product copy; server/policy annotations are explicitly part of the technical explainer, not signup UI.

## Motion
Single persistent phone shell throughout the body scene. Under-damped closed-form spring for meaningful additions; continuous camera transforms, 1.02–1.17 scale with purposeful vertical framing changes. Error appears on the existing field before its local shake. No empty panel swaps. Final CTA covers the still-visible body with a 600ms dissolve.

## What NOT to Do
- No global fade between requirements.
- No effect without a visible target.
- No motion instructions spoken or shown to viewers.
- No decorative labels such as FORM FIELD / FE CHECKS / HERO.
- Do not make both columns fit by shrinking type.

## Media choice
The subject is changing input behavior; deterministic UI animation explains it directly. Stock/B-roll would interrupt object continuity. Matching prepared audio is reused; complete production-direction beats are removed using their measured timing boundaries, from both audio and captions. If only an existing release remains, its exact beat SRT can recover the timing manifest. No paid generation, new voice synthesis, remote publishing or deployment.
