# Shorts template API

`src/templates/registry.ts` is the shared module API used by generation, review,
Remotion and the CLI. No HTTP server is required by this Actions-based pipeline.

- `listTemplates()` returns available IDs, names, renderer keys, assets and instructions.
- `getTemplate(id)` resolves an ID or throws for an unsupported ID.
- `resolveTemplate(manifest)` uses `style.template`, then legacy `style.theme`,
  then `monochrome-editorial-dark`. Explicit unknown IDs fail before media preparation.
- `node shorts/scripts/templates.mjs [id]` returns the catalog or one definition as JSON.
- `style.template` persists in candidate JSON through review and media preparation.
  The existing `ShortVideo` composition dispatches to the selected renderer in both
  storyboards and final videos. Old manifests keep their original rendering.

In **Generate blog shorts** (`generate-shorts.yml`), select `template: notebook-grid`.
CLI: `SHORTS_TEMPLATE=notebook-grid node shorts/scripts/generate-candidates.mjs URL 5`.
Existing manifests can opt in with `"style": {"template": "notebook-grid", ...}`.
Preview CLI also accepts `SHORTS_TEMPLATE=notebook-grid`.
Generation and storyboard AI review receive the selected visual policy after the
default visual rules; narrative accuracy and language policies continue to apply.

## Notebook Grid

- 1080×1920, full-bleed pale ivory graph paper. Fixed paper background, black
  Pretendard, muted orange rules and emphasis, 2px separators and small endpoint dots.
- Content uses x=80..900, y=180..1554. Four conceptual columns merge into full-width
  title/visual rows or two comparison columns. Maximum three meaningful regions.
- The first frame uses the candidate's overall title, then short scene messages.
  Titles 80–100px, body 44px; subtitles prefer 48px and never drop below 36px.
  Runtime rejects text that cannot fit and subtitles exceeding two lines.
- Lines reveal first, then text and visuals with short fades and 10px movement.
  Scene transitions/cameras/effects are normalized to this template's restrained
  motion. Semantic diagram animation and original audio timing remain active.
- Existing monochrome diagram geometry and labels are inverted together in a
  scoped layer. Paper, photos and presenter are not inverted.
- Common CTA retains the established shared black design and duration.
  Explicit scene presenters and persistent presenter tracks remain supported.
  Lower-right presenter space is reserved beside the caption.

### Printed photographs and tape stickers

Use original resolved photos, with their provenance and license retained. Search
for the actual subject, not a notebook mockup, taped photograph or decorated print.
Do not bake frames, tape, captions or generated lettering into the source image.

`PrintedPhoto.tsx` composes three independent layers:

1. White print backing: 18px at top/left/right and 40px at bottom, very faint contact shadow.
2. Original image: `object-fit: contain`, preserving faces, writing and the entire
   image. Extra white space is allowed when the original aspect ratio differs.
3. One matte ivory PNG tape sticker at the top center: 220px asset width, -4°,
   opacity .62. About half the visible tape overlaps the print edge, the rest
   touches the notebook. Keep it within the white border, away from the subject.

The print remains level and aligned to the grid. Avoid excessive stickers,
random rotation, torn frames and decorative UI cards. Photo reveal and tape move
together as one object. All photo layouts, including legacy `photo-full-bleed`,
use this print treatment under `notebook-grid`. Videos use a separate inset region.

### Assets

`public/templates/notebook-grid/paper.png` — generated in this design session:
pale ivory paper fibers, very faint square grid, full-bleed vertical background,
no text, desk, binding, shadows or layout content.

`public/templates/notebook-grid/tape.png` — generated in this design session:
one horizontal translucent ivory washi strip, subtle fibers, torn short ends,
straight-on, actual RGBA transparency, no text or background. The source contains
transparent padding; the component accounts for it. Alpha is preserved unchanged;
additional compositing opacity makes the underlying print visible.

## Adding another template

Register its ID, asset paths and visual instructions; implement its React renderer
and add the renderer mapping in `TemplateVideo.tsx`. Add the same ID to the workflow
choice list. `templates.test.mjs` detects selector/catalog drift. Extend render
verification with Korean title, caption, comparison, photo, diagram and transition
frames, including intermediate motion states.
