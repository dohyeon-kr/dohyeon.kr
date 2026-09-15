# Monoliquid v2 — HyperFrames

## Purpose

Monoliquid v2 translates the existing `themes/monoliquid` Ghost identity into a deterministic 9:16 motion system for shorts. It is not a new brand. Colors, type and geometry come from the existing theme; HyperFrames adds timing and motion.

## Style Prompt

High-contrast monochrome editorial motion with a black outer frame, square geometry, thin registration rules, industrial nickel accents and restrained black-metal texture. The default canvas may be white/paper or, when `style.colorScheme: "dark"` is selected, near-black with white ink. Korean copy uses Pretendard; terse Latin labels use Archivo Expanded. Composition should feel like a printed technical/editorial sheet brought to life, not a rounded SaaS card UI. Motion is sharp and subtle: short vertical entrances, line reveals, hard cuts and restrained wipes. Visual hierarchy comes from scale, whitespace, rules and inversion rather than decorative color.

## Colors

These values mirror `themes/monoliquid/assets/css/screen.css`.

- Frame / ink: `#000000`
- Canvas: `#ffffff`
- Paper: `#f3f3f3`
- Paper 2: `#e5e5e5`
- Muted ink: `#4c4c4c`
- Muted 2: `#737373`
- Metal: `#c9c9c9`
- Metal 2: `#a8a8a8`
- Metal 3: `#6f6f6f`
- Metal 4: `#292929`
- Nickel: `#9f9f9f`

Dark mode inverts the semantic ink/canvas tokens while preserving the same monochrome palette. No chromatic accent is introduced in v2. Emphasis uses black/white inversion, nickel, rule weight and scale.

## Typography

- Korean / body / captions: `Pretendard`, variable weight 45–920.
- Latin overlines and compact technical labels: `Archivo Expanded`, 900.
- Headlines: Pretendard 800–920, generally 80–128 px at 1080×1920.
- Body/subline: 42–56 px.
- Burned-in captions: 44–52 px, maximum two lines.
- Avoid handwriting and novelty display fonts.

## Geometry

- Working canvas: 1080×1920.
- Black frame: 18 px minimum.
- Main paper inset: 32 px from frame.
- Content safe area: 72 px horizontal, 140 px top, 280 px bottom.
- Persistent presenter uses the bottom-right circular zone: x 780–1010, y 1430–1700. Captions stay left of it.
- Corners are square. `border-radius: 0` for content panels. Circles are reserved for semantic nodes or presenter framing.
- Use 1–3 px rules, registration ticks and rectangular labels. Rule color follows the active black/white ink token.

## Scene Language

### Hero

One large idea. Oversized headline, compact source/section label, optional monochrome photo. The first frame must communicate the subject without requiring the caption. A strong literal image may use `photo-full-bleed` so the photo fills the complete scene behind the editorial type.

### Statement

A single sentence or contrast. Use scale and black/white inversion rather than extra icons. Keep one dominant block and at most one supporting block. Literal documentary moments may also use `photo-full-bleed` when a photograph carries more meaning than a diagram.

### Photo

Use a large documentary/editorial image. Desaturate visually through CSS. `photo-full-bleed` must fill the scene edge-to-edge, add a dark readability veil, and keep headlines/captions inside safe areas. Do not add decorative frames beyond the Monoliquid rule system. Preserve attribution in release metadata outside the composition.

### Compare

Two rigid columns separated by a rule. Left/right labels are short. Avoid card stacks.

### Diagram

Prefer line, node, flow and relation diagrams. No meaningless pictograms. Labels stay sharp and stationary while lines/nodes animate.

### Outro

Minimal. Return to the core sentence or CTA. A final literal metaphor such as an open doorway may be full-bleed when it cleanly closes the narrative. Do not fill the canvas with secondary information.

### Presenter

When `presenterOverlay` is present, render the presenter persistently in the bottom-right circular frame on non-CTA scenes. It is a supporting anchor, not the primary visual. It must not cover the headline, captions or critical photo subjects. The shared CTA may hide it with `hideOnCommonCta`.

## Motion

- Build the hero/end layout first; animation starts from that known layout.
- Default entrance: `y: 28–44`, `opacity: 0 → 1`, 0.35–0.6 s.
- Headline and primary visual may overlap entrance timing by 0.1–0.2 s.
- Rules reveal with `scaleX`/`scaleY` from 0.
- Photo settles from `scale: 1.025` to `1`.
- Exit is shorter than entrance: 0.2–0.35 s.
- Prefer hard cuts between scenes. Fade only when the narrative calls for continuity.
- No bounce, elastic easing, random motion or infinite loops.
- Deterministic animation only.

## Layout Safety

- Every scene must have a valid static hero frame before motion is applied.
- The headline must not enter the bottom caption zone.
- Captions must stay left of the presenter zone where possible.
- Full-bleed photos require enough darkening behind text to preserve contrast throughout the frame.
- Intentional decorative overlap is allowed; semantic text overlap is not.
- HyperFrames `lint` and `inspect` are mandatory before preview/final render.

## What NOT to Do

- No gradients as decoration, neon or arbitrary brand colors. A functional dark photo-readability veil is allowed on full-bleed media.
- No rounded SaaS cards or pill-heavy UI.
- No floating decorative icons without narrative meaning.
- No small dense paragraphs.
- No random scribble/jitter on text.
- No 3D extrusion, glassmorphism or soft drop-shadow UI.
- No motion that changes the final layout geometry while the viewer is reading.

## Source of Truth

When this document conflicts with the current Ghost theme, the values in `themes/monoliquid/assets/css/screen.css` win for visual identity. SNS-specific safe areas and timing rules in this file win for 9:16 composition.