# Programmable presenter prototype

**Current public contract:** [Presenter API v1](presenter-api.md). Candidate authors should use semantic actions/expressions and the generated schema, not the low-level rig controls below. The white `presenter-bust` layout is now connected to both video renderers.

The approved monochrome character concept is redrawn as editable SVG paths, not a PNG cutout or a pose-image slideshow. This is a first vector interpretation, not an exact automatic tracing. The reference portrait is not uploaded to the repository.

## Components

- `src/presenter/Presenter.tsx`: pure React/SVG; white circular background, black border, bust-only clip. Outside the circle stays transparent. `data-part` groups identify editable body parts.
- `src/presenter/rig.ts`: typed and bounded controls, gesture cues, blinking and optional amplitude-envelope sampling. All animation is a deterministic function of time, including reverse seeking.
- `src/presenter/PresenterPreview.tsx`: a 12-second, 800×800 demonstration on white. Its mouth input is **authored cases, not real TTS**. `PresenterGallery.tsx` shows all actions, hands, expressions and mouth shapes.

```tsx
const pose = poseAt(frame / fps, {
  cues: [{startSeconds: 1, endSeconds: 4, gesture: 'explain'}],
  expression: 'smile',
  envelope: {sampleRate: 30, samples: mouthAmplitudes},
});
<Presenter pose={{...pose, headTilt: -4, gazeX: .25}} />
```

Controls: `headTilt` (degrees), `gazeX/Y` (-1…1), `blink` and `mouthOpen` (0…1), `expression` (neutral/smile/curious), `leftHandX/Y`, `rightHandX/Y` (SVG-space targets), and `leftWrist`/`rightWrist` (independent absolute degrees). Hand targets replace the prototype's four joint-angle controls. `rest`, `explain`, and `present` are gesture presets, not image swaps. The head carries glasses and all facial features as one group.

The intended usage is a bordered circular bust avatar on white; the dark preview and halo option have been removed. The outer line is 6 SVG units (previously 5), with finer 3–4 unit facial details. Hair wisps, clothing creases, stepped lapels, and multi-finger silhouette zigzags are removed. Preserve the center part, glasses and face as the identifying features.

Draw order is torso/neck → continuous back sleeves → overshirt → foreground forearms/hands → head/face. Forearms can cross in front of the chest. Rounded sleeves maintain a consistent width; independent mirrored hands do not dangle with the forearm rotation. `showJoints` marks neck, shoulder, elbow and wrist positions. This is a front-facing puppet, not a 3D turntable.

## Motion research applied

- [Spine IK constraints](https://en.esotericsoftware.com/spine-ik-constraints): hand-target control with a two-bone chain and an explicit bend direction. Our analytic solver preserves 120/112-unit bone lengths and clamps reach four units short of full extension. This reach margin is **not** an implementation of Spine's soft-IK algorithm.
- [Live2D arm deformation tutorial](https://docs.live2d.com/4.2/en/cubism-editor-tutorials/deformer/): joint placement and contour/volume need attention as well as rotation. Here this is implemented with rounded SVG sleeves and layered contours, not Live2D meshes or its runtime.
- Motion design choices: one active hand at a time, smaller chest-height gestures, 0.7-second smooth entry/exit, a slight curved hand trajectory, and an 80ms wrist settling offset. All poses remain deterministic for seeking and parallel rendering.

## Preview and limits

Run `npm run studio` in `shorts` and select `PresenterRigPreview`. The presenter-specific CI job renders rest, gesture, closed-eye, and speaking frames plus an MP4. Tests check target bounds, bone lengths, reach limits, bend direction and frame-to-frame continuity. Existing video scenes and CTA remain unchanged: this prototype is not automatically inserted into published reels.

Automatic real-TTS phoneme extraction/alignment is **not implemented**. A provider-neutral timed-phoneme adapter and render-manifest mouth track are available. Candidate generation/review now expose semantic actions/expressions. A dedicated white page renders the presenter; arbitrary floating overlays beside existing diagrams are not supported. See the current API guide for precedence, validation and the TTS boundary.
