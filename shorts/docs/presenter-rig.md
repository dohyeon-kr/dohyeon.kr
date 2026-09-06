# Programmable presenter prototype

The approved monochrome character concept is redrawn as editable SVG paths, not a PNG cutout or a pose-image slideshow. This is a first vector interpretation, not an exact automatic tracing. The reference portrait is not uploaded to the repository.

## Components

- `src/presenter/Presenter.tsx`: pure React/SVG; no Remotion runtime dependency. Transparent background by default. `data-part` groups identify editable body parts.
- `src/presenter/rig.ts`: typed and bounded controls, gesture cues, blinking and optional amplitude-envelope sampling. All animation is a deterministic function of time, including reverse seeking.
- `src/presenter/PresenterPreview.tsx`: an 8-second Remotion demonstration on white or black. Its mouth input is **synthetic, not real TTS**.

```tsx
const pose = poseAt(frame / fps, {
  cues: [{startSeconds: 1, endSeconds: 4, gesture: 'explain'}],
  expression: 'smile',
  envelope: {sampleRate: 30, samples: mouthAmplitudes},
});
<Presenter pose={{...pose, headTilt: -4, gazeX: .25}} />
```

Controls: `headTilt` (degrees), `gazeX/Y` (-1…1), `blink` and `mouthOpen` (0…1), `expression` (neutral/smile/curious), and four arm joint angles. `rest`, `explain`, and `present` are gesture presets, not image swaps. The neck, shoulder and elbow transforms use local pivot coordinates; arm parts are nested. The head carries glasses and all facial features as one group.

Draw order is legs/torso/neck → arms → overshirt → head/ears/face/hair → eyebrows/eyes/glasses/nose/mouth. The cuff masks the rotating elbow seam. White opaque fills preserve the character on dark backgrounds. Body/head changes stay within limited angles; this is a front-facing puppet, not a 3D turntable. `showJoints` optionally marks neck/shoulder pivots for debugging.

## Preview and limits

Run `npm run studio` in `shorts` and select `PresenterRigPreview` or `PresenterRigDarkPreview`. The presenter-specific CI job renders rest, gesture, closed-eye, and speaking frames plus an MP4. Existing video scenes and CTA remain unchanged: this prototype is not automatically inserted into published reels.

Real TTS ingestion, phoneme/viseme alignment, automatic semantic gesture selection, and placement beside existing slide content are **not implemented**. The envelope interface accepts 0…1 mouth amplitudes at a stated sample rate relative to the scene's audio start; absent input means a closed mouth. Amplitude-driven mouth motion is not phoneme-accurate lip sync. These integration tasks follow visual approval of the rig.
