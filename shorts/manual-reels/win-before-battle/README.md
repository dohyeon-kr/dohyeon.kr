# 이기고 나서 싸우는 사람 · Declarative Dither Reel

- Source discussion: 손자병법 군형, 승률의 선행요인, 승리에 기울어진 상태, 리스크 감소
- Authoring branch: reels/win-before-battle-20261111
- Runtime: HyperFrames 0.9.31 + GSAP, 1080 × 1920, 30 FPS, 43.8 s
- Voice: HeyGen Velvet Scholar, Korean, voice_id 9f774d1a93b84a26aa3da3cf5ddf6135
- Audio source: HeyGen output WAV (42.893 sec), resample 48 kHz, final AAC 192 kbps. No lossy intermediary.
- Files: index.html (deterministic screen-space Bayer 8×8 renderer), script.srt, instagram-caption.md
- Scene lengths: 0, 3.328, 9.472, 16.035, 19.730, 25.234, 29.650, 33.997, 39.180, 43.8
- Visual: screen-fixed 15.45px ordered-dot grid, per-frame time-driven luminance/geometry and ring/branches; typography remains sharp outside the dither layer
- Safe text: x96–920; y270–1530. Visual stage: x96–984, y320–1110.
- Cover: still of opening question at t=1.8 sec, Instagram center 4:5 crop y285–1635
- Verification: same-frame deterministic seek, varied dither density across time and gradient, cover crop, audio stream (48 kHz AAC >=160k), MP4 duration, freeze frame and black-frame checks. HyperFrames lint/check/snapshot when supported.

Build locally:
```
npm install --no-save hyperframes@0.9.31 gsap@3.14.2
npx hyperframes lint
npx hyperframes check
npx hyperframes snapshot --at 1.8,13.0,22.0,31.0,41.0
npx hyperframes render --output output/silent.mp4 --fps 30 --quality high
```

The workflow in .github/workflows/manual-reel-win-before-battle.yml owns downloading the original voice and muxing the final MP4. It is a self-contained manual reel, not a registration of a new auto-rendering production template.
