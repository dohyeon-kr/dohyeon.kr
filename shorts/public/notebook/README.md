# Notebook raster assets

- marks.webp and papers.webp: user-supplied generated sticker/paper sheets, transcoded to WebP; no invented transparent alpha. SVG/Canvas sprite crops and screen compositing remove the dark background visually.
- Marker ink: an interior crop from marks.webp is mapped to the code-controlled line path. Geometry is deterministic; the texture is not randomized per frame.
- Handwriting: Nanum Pen Script, selected from https://noonnu.cc/font_page/44. Upstream https://github.com/google/fonts/tree/main/ofl/nanumpenscript, SIL OFL license included. `node scripts/prepare-notebook-assets.mjs` downloads an immutable revision and verifies its Git blob SHA. Runtime render and Studio prepare it automatically.
- Original images: 8d600547-5224-4a2e-8aad-fef2414b9de7.png and 0bf278f2-b3d2-4875-8edc-555fca15d8e6.png, supplied in the design review.
