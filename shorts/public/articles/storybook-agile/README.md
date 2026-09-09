# Storybook article diagrams

Source: https://blog.dohyeon.kr/naneun-wae-storybookeul-aejail-doguro-sayonghagiro-haessneunga/

The article's three explanatory diagrams are redrawn as 1200×1600 PNGs with
deterministic scribble geometry and Pretendard Korean text. Original screenshots
are not replaced. These images are shared by the article replacement and shorts.

| File | Article position | Existing image suffix |
| --- | --- | --- |
| feedback-timing.png | 작업을 잘게 나눠도 피드백은 늦을 수 있다, after final paragraph | 2026-09-01-0013.png |
| three-inputs.png | MSW 응답을 바로 바꿀 수 있는 도구를 만들었다, after final paragraph | 2026-09-01-00132.png |
| validation-scopes.png | Storybook에서 확인할 범위를 정했다, after final paragraph | 2026-09-01-00133.png |

Owner: 주도현. Created for this request from the author's article and existing
diagrams. Do not label these as stock photography or actual application screenshots.
The shorts use `visual.type=photo` to load the raster file and
`image.source=authored-diagram` to preserve the entire diagram with `contain`.
The photograph crop mode must not remove labels from these images.

Recreate: `python shorts/scripts/create-storybook-diagrams.py` (Pillow and fontTools).
The script uses the repository's bundled Pretendard font. Preview PNGs are local QA
outputs; only the three full-resolution files are used in content.

Verified: original relationships and Korean labels reviewed; 450×600 static image
previews inspected. Full video and TTS verification remain separate.

Publication status: **pending**. Ghost's existing image deletion was blocked by
automatic approval review. The article's original images and text remain intact.
After approval, replace only the three image cards above, preserve the three UI
screenshots and all body text, then update the existing published post without
sending a newsletter. Do not treat repository publication as blog replacement.
