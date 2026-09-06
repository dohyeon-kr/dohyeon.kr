# Ink presenter motion proof

## Face-focused framing update

![Current 1.2× portrait framing](presenter-zoom.png)

The current portrait scales all character layers uniformly by 1.2 around (627, 135),
inside the unchanged circular clip. This keeps the hairline near its original position
and crops more of the lower torso. The PNG above is rendered from the updated SVG.
Typecheck and 27 presenter tests pass; default, nod, ±12° tilt, blink and open-mouth
stills were visually checked. The older GIF/MP4 below predate this framing change.

## Previous motion proof

Current revision: lowered collar faces behind the neck, rigid matching lens rims,
and an 8 Hz deterministic ink boil (seed 23 + inkFrame % 97, displacement 3.2 SVG units).
Glasses, the white page and circular border remain unfiltered. `presenter-ink-collar.png`
is a 3× detail crop for inspecting seams and edge texture, not a larger stroke setting.

The PNG/GIF/MP4 beside this note are rendered from the actual `Presenter.tsx`
SVG with React server rendering and SVG rasterization, not image-generated motion.
The MP4 contains 192 frames at 24 fps (8 seconds); the GIF is a 16 fps derivative.
These proofs isolate the character and do not replace full-page Remotion QA.

Input for `compilePresenter(spec, 8)`:

```ts
const spec = {
  actions: [
    {start: .5, end: 2.5, name: 'explain'},
    {start: 5, end: 7, name: 'emphasize'},
  ],
  expressions: [
    {start: 0, end: 3, name: 'smile'},
    {start: 3, end: 5, name: 'curious'},
    {start: 5, end: 8, name: 'neutral'},
  ],
  mouths: Array.from({length: 12}, (_, i) => ({
    start: 4 + i * .23,
    end: 4 + i * .23 + .19,
    shape: ['A', 'I', 'M', 'O'][i % 4],
    intensity: .45,
  })),
};
```

Sample `evaluate(frame / 24)` and pass it to `<Presenter pose={pose} />`.
Render at 600×600 for the movie, 800×800 with default props for the detail still.
Blinking is evaluated by the existing deterministic blink track. The facial ink
paths are a reconstruction of the approved reference, not its original pixels.
Speech cases here are authored test timings, not audio or TTS alignment.
