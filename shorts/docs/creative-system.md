# Shorts creative system

The shorts pipeline is designed as a **motion infographic generator**, not an AI slide generator.

The core translation is:

> Meaning → visual relationship → visual strategy → choreography

A scene should not merely decorate a sentence. It should explain the sentence through spatial change, motion, comparison, or a concrete visual anchor.

## Pipeline

```text
Script
→ semantic beats
→ emphasis / rhythm map
→ scene split
→ art direction
→ visual relationship
→ visual strategy
→ asset resolution or direct rendering
→ style normalization
→ layout composition
→ element choreography
→ camera movement
→ subtitle animation
→ scene transition
→ render
```

## Art direction

Default preset:

- monochrome
- editorial
- sharp
- minimal
- tech
- black / charcoal base
- white primary type
- gray secondary lines and labels
- low-saturation or grayscale source photography
- restrained motion vocabulary

Raw assets do not define the mood. Every asset is normalized into the same visual language at render time.

### Normalization policy

- Photography: grayscale, controlled contrast, no warm stock-photo look.
- Icons: one stroke/fill family per video.
- Illustrations: do not mix unrelated illustration styles inside one video.
- Graphs and diagrams: prefer first-party rendering so font, stroke, radius, and animation remain consistent.
- Motion: fade, slide, scale, reveal, draw, zoom, pan. Avoid bounce, spin, elastic, and ornamental overshoot.
- Texture: optional subtle grain only when it helps unify mixed sources.

## No meaningless template decoration

Do not render template labels such as:

- `PHOTO / PHOTO`
- `IMAGE`
- `VIDEO`
- `STATEMENT / LEVERAGE`
- `VISUAL / ROI-CURVE`

Also avoid decorative boxes, quote marks, English captions, counters, or UI fragments that exist only to make the frame look designed.

Every visible element must do at least one job:

1. communicate information
2. emphasize meaning
3. provide context
4. guide attention
5. control rhythm

Otherwise remove it.

## Visual resolver

Do not map a keyword directly to an icon. First identify the relationship in the sentence.

Preferred strategy order:

1. simulation
2. graph
3. spatial diagram
4. physical metaphor
5. photo / B-roll
6. icon fallback

Examples:

| Concept | Weak fallback | Preferred expression |
| --- | --- | --- |
| leverage | rising arrow | lever / seesaw: small force lifts a large load |
| ROI / efficiency | arrow | input-output curve or comparative curve |
| trade-off | scale icon | balance that actually tilts |
| bottleneck | warning icon | flow accumulating at a narrow gate |
| accumulation | stack icon | objects or values visibly stacking |
| convergence | target icon | multiple paths moving toward one point |
| zoomed learning | magnifier icon | overview → camera zoom into one region |
| network effect | network icon | nodes increase while edges grow faster |

### Graph-first cases

Prefer graphs for:

- change over time
- cumulative effects
- efficiency
- ROI
- widening gaps
- relative slopes
- diminishing returns
- before/after trajectories

Graphs should animate. A useful pattern is:

`overview → curve reveal → endpoint/inflection zoom → annotation`

## Motion and choreography

Scene transitions and element animations are different layers.

A scene should normally contain 1–3 meaningful motion events rather than making every element move continuously.

Canonical choreography events:

- `show-visual`
- `show-headline`
- `show-subline`
- `advance-visual`
- `camera-focus`
- `emphasize-result`

The model may add a meaningful kebab-case event when needed.

Important rule:

> Translate verbs into motion.

If narration says something expands, the visual should expand. If it accumulates, it should stack. If it bottlenecks, flow should visibly slow or queue. If the script says to inspect a detail, the camera should move into that detail.

## Camera motion

Camera motion is separate from element motion.

Use camera movement for semantic changes in viewpoint:

- overview → detail
- full graph → endpoint
- full graph → inflection point
- system map → one node
- whole object → meaningful mechanism

Keep ordinary scenes static or use a subtle push-in. Zoom is not decorative punctuation.

## Subtitle rhythm

Subtitles are treated as a **rhythm score**, not a character-count split.

Each semantic beat carries:

- text
- emphasis: `low | mid | high`
- delivery: `normal | push | hold | drop`
- pause after the beat
- visual priority
- optional keyword
- optional visual cue

Rules:

- Split by meaning, not morphology.
- Avoid fragments like `그럴 / 수 / 있다`.
- Prefer at least four non-space Korean characters per beat.
- A short punch word may stand alone when the separation is intentional: `없다`, `아니다`.
- Do not mark everything as high emphasis.
- Prefer 1–2 high-emphasis beats per sentence.
- Conclusions, contrast, numbers, reversals, declarations, and core concepts are the strongest emphasis candidates.

Subtitle emphasis should affect the visual treatment as well as timing. A high-emphasis beat can become slightly larger, enter more decisively, or invert its keyword. Avoid karaoke-like word-by-word popping.

## Asset sources

Current automated photo resolution uses Openverse with CC0 / Public Domain Mark filtering.

Useful source pools for future resolvers or manual review:

### Photo / B-roll

- Pexels
- Coverr
- Mixkit
- Pixabay

### SVG / icon

- SVG Repo
- Icons8
- Flaticon

### Motion / illustration

- LottieFiles
- Storyset
- unDraw

### SFX / motion templates

- Mixkit
- Pixabay
- Motion Array
- Envato Elements
- Artlist

These sources are **material pools, not style systems**. Imported assets still pass through the art-direction and normalization policy above. License checks remain mandatory for every source actually integrated into automation.

## Schema v3

New candidate manifests add:

- `beats`
- `visualIntent`
- `choreography`
- `camera`
- expanded style metadata

Older v1/v2 manifests remain renderable through existing fallbacks.
