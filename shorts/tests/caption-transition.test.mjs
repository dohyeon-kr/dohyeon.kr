import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/ShortVideo.tsx', import.meta.url), 'utf8');

test('burned-in captions stay outside scene transition transforms', () => {
  const sceneFrameStart = source.indexOf('const SceneFrame:');
  const videoStart = source.indexOf('export const ShortVideo:');
  assert.ok(sceneFrameStart >= 0 && videoStart > sceneFrameStart);
  const sceneFrame = source.slice(sceneFrameStart, videoStart);
  assert.doesNotMatch(sceneFrame, /<CaptionOverlay\b/);

  const video = source.slice(videoStart);
  const transition = video.indexOf('<SceneTransitionStage');
  const caption = video.indexOf('<CaptionOverlay');
  assert.ok(transition >= 0 && caption > transition, 'caption must render as a Sequence sibling after the transition stage');
});

test('caption keeps Pretendard after leaving SceneFrame inheritance', () => {
  assert.match(source, /const FONT_FAMILY = 'Pretendard, Arial, sans-serif'/);
  assert.match(source, /data-layout="caption"[^\n]+fontFamily: FONT_FAMILY/);
  assert.match(source, /data-layout-text="caption"[^\n]+fontFamily: FONT_FAMILY/);
  assert.match(source, /background: WHITE, color: BLACK, fontFamily: FONT_FAMILY/);
  assert.match(source, /<AbsoluteFill style=\{\{background: BLACK, fontFamily: FONT_FAMILY\}\}>/);
});

test('persistent presenter caption width reserves scaled clearance', () => {
  assert.match(source, /PRESENTER_OVERLAY_BOX\.left/);
  assert.match(source, /CAPTION_PRESENTER_GAP = 24/);
  assert.match(source, /MAX_CAPTION_SCALE = 1\.035/);
  assert.match(source, /width: overlay \? CAPTION_WIDTH_WITH_PRESENTER/);
});
