import React, {useMemo, useRef, useId} from 'react';
import {AbsoluteFill, Html5Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {RenderManifest, RenderScene} from '../types';
import {previewSceneFrames} from '../template-preview';
import {subtitleAt} from '../subtitles';
import {fitCopy, textUnits} from '../text-layout';
import {useLayoutCheck} from '../use-layout-check';
import {NotebookUiScene} from '../visuals/NotebookUiScene';
import {DiagramRenderer} from '../visuals/DiagramRenderer';
import {PresetVisual} from '../visuals/PresetVisual';
import {VideoBackground} from '../video/VideoBackground';
import {BlogCta} from '../BlogCta';
import {Presenter} from '../presenter/Presenter';
import {compilePresenter, validateScenePresenter} from '../presenter/api';
import {PersistentPresenter} from '../presenter/PersistentPresenter';
import {validatePresenterOverlay} from '../presenter/overlay';
import {getTemplate} from './registry';
import {PrintedPhoto} from './PrintedPhoto';
import {ScribbleFilter} from '../visuals/ScribbleFilter';

const INK = '#171715', ACCENT = '#c87829', RULE = '#bcb5a9';
const LEFT = 80, WIDTH = 820;
// Calibrated against the supplied Reels screenshot; keep the paper full-bleed.
const CONTENT_OFFSET_Y = 100;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const reveal = (frame: number, start: number) => interpolate(frame, [start, start + 12], [0, 1], clamp);

function copy(text: string, width: number, height: number, preferred: number, minimum = 44) {
  const result = fitCopy(text, width, height, preferred, 1.25);
  if (text.trim() && result.fontSize < minimum) throw new Error(`[layout:notebook] Shorten copy to keep it readable at ${minimum}px: ${text}`);
  return result;
}
const Rule: React.FC<{top: number; progress: number; width?: number}> = ({top, progress, width = WIDTH}) => <div style={{position: 'absolute', left: LEFT, top, width, height: 2, background: ACCENT, transform: `scaleX(${progress})`, transformOrigin: 'left'}}>
  {[0, width - 5].map(left => <span key={left} style={{position: 'absolute', left, top: -2, width: 6, height: 6, borderRadius: '50%', background: ACCENT}} />)}
</div>;

const ScenePresenter: React.FC<{scene: RenderScene; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  const evaluate = useMemo(() => {
    validateScenePresenter(scene, frames / 30);
    return compilePresenter(scene.presenter ?? {}, frames / 30);
  }, [scene, frames]);
  return <div style={{width: 500, height: 500, margin: '0 auto', borderRadius: '50%', overflow: 'hidden'}}><Presenter pose={evaluate(frame / 30)} /></div>;
};

const NotebookScene: React.FC<{scene: RenderScene; index: number; title: string; overlay: boolean}> = ({scene, index, title, overlay}) => {
  const frame = useCurrentFrame(), root = useRef<HTMLDivElement>(null);
  useLayoutCheck(root, frame);
  const titleScribbleId = `title-scribble-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const frames = previewSceneFrames(scene);
  const isCta = scene.commonPage === 'blog-cta-v1';
  const lines = reveal(frame, 0), content = reveal(frame, 8);
  const exit = interpolate(frame, [frames - 6, frames - 1], [1, 0], clamp);
  const cue = subtitleAt(scene, frame / 30);
  const caption = copy(cue?.text ?? '', overlay ? 580 : WIDTH, 144, 48, 36);
  if (caption.text.split('\n').length > 2) throw new Error('[layout:notebook] Split subtitle into beats of at most two lines');
  const description = copy(scene.subline ?? '', WIDTH, 110, 44);
  const compare = !scene.uiMotion && !scene.diagramSpec && (scene.kind === 'compare' || scene.layout?.startsWith('compare-'));
  const hasVisual = scene.uiMotion || compare || scene.presenter != null || scene.backgroundVideo || scene.imagePath || scene.diagramSpec || (scene.visual && scene.visual.type !== 'none');
  const headingHeight = hasVisual ? 275 : scene.subline ? 650 : 850;
  const headingText = index === 0 ? title : scene.headline;
  // Preserve Korean words when enlarging an intentionally line-broken heading.
  const longestWord = Math.max(1, ...headingText.split(/\s+/).map(textUnits));
  const headingSize = hasVisual ? (index === 0 ? 100 : 80) : Math.min(152, Math.floor(WIDTH / longestWord));
  const heading = copy(headingText, WIDTH, headingHeight, headingSize);
  const scribbleHeading = Boolean(headingText.trim());
  const diagramLayout = scene.uiMotion || scene.diagramSpec
    ? {left: 40, top: headingText.trim() ? 600 : 320, width: 900, height: headingText.trim() ? 570 : 850}
    : {left: LEFT, top: 600, width: WIDTH, height: 570};
  const photoHeight = scene.subline ? 570 : headingText.trim() ? 720 : 1000;
  const photoLayout = {left: LEFT + (WIDTH - photoHeight * .75) / 2,
    top: headingText.trim() ? 600 : 320, width: photoHeight * .75, height: photoHeight};
  const visualLayout = scene.imagePath && !compare && !scene.presenter && !scene.backgroundVideo
    ? photoLayout : diagramLayout;
  // Common CTA deliberately retains its established shared design and duration.
  if (isCta) return <AbsoluteFill style={{opacity: reveal(frame, 0), filter: `blur(${(1 - reveal(frame, 0)) * 12}px)`}}><BlogCta layer="visual" scene={scene} /><BlogCta layer="text" scene={scene} /></AbsoluteFill>;
  return <AbsoluteFill ref={root} style={{color: INK, opacity: exit, fontFamily: 'Pretendard, Arial, sans-serif'}}>
    <AbsoluteFill style={{transform: `translateY(${CONTENT_OFFSET_Y}px)`}}>
    {scribbleHeading && <ScribbleFilter id={titleScribbleId} />}
    <Rule top={238} progress={lines} />
    <div data-layout-text="label" style={{position: 'absolute', left: LEFT, top: 180, background: INK, color: '#fff', padding: '8px 14px', fontSize: 28, fontWeight: 800, opacity: content}}>{String(index + 1).padStart(2, '0')} · {index === 0 ? '주제' : scene.kind === 'outro' ? '정리' : '노트'}</div>
    <div data-layout-text="headline" style={{position: 'absolute', top: hasVisual ? 285 : 350, left: LEFT, width: WIDTH, height: headingHeight, filter: scribbleHeading ? `url(#${titleScribbleId})` : undefined, display: 'flex', alignItems: hasVisual ? 'flex-start' : 'center', fontSize: heading.fontSize, fontWeight: 900, lineHeight: 1.25, whiteSpace: 'pre-wrap', opacity: content, transform: `translateY(${(1 - content) * 10}px)`}}>{heading.text}</div>
    {hasVisual && <div data-layout="visual" data-overlay-reserve="visual" style={{position: 'absolute', ...visualLayout, opacity: reveal(frame, 16)}}>
      {compare ? <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', height: '100%', borderTop: `2px solid ${RULE}`, borderBottom: `2px solid ${RULE}`}}>
        {[scene.comparisonLeft, scene.comparisonRight].map((text, i) => {
          const fitted = copy(text ?? '', 350, 430, 56);
          return <div key={i} style={{gridColumn: 'span 2', boxSizing: 'border-box', borderLeft: i ? `2px solid ${ACCENT}` : undefined, padding: '30px 24px', opacity: reveal(frame, 16 + i * 6)}}>
            <div style={{fontSize: 28, marginBottom: 30, color: ACCENT, fontWeight: 800}}>{String(i + 1).padStart(2, '0')}</div>
            <div data-layout-text={`compare-${i}`} style={{fontSize: fitted.fontSize, fontWeight: 800, lineHeight: 1.25, whiteSpace: 'pre-wrap'}}>{fitted.text}</div>
          </div>;
        })}
      </div> : scene.presenter != null ? <ScenePresenter scene={scene} frames={frames} />
        : scene.backgroundVideo ? <VideoBackground scene={scene} />
        : scene.uiMotion ? <div style={{position:'absolute',left:(visualLayout.width-scene.uiMotion.width*Math.min(visualLayout.width/scene.uiMotion.width,visualLayout.height/scene.uiMotion.height))/2,top:(visualLayout.height-scene.uiMotion.height*Math.min(visualLayout.width/scene.uiMotion.width,visualLayout.height/scene.uiMotion.height))/2,transform:`scale(${Math.min(visualLayout.width/scene.uiMotion.width,visualLayout.height/scene.uiMotion.height)})`,transformOrigin:'top left'}}><NotebookUiScene spec={scene.uiMotion} durationInFrames={frames} /></div>
        : scene.imagePath ? <PrintedPhoto src={scene.imagePath} fit={scene.image?.source === 'authored-diagram' ? 'contain' : 'cover'} />
        : <div style={{width: '100%', height: '100%', filter: 'invert(1)', mixBlendMode: 'multiply'}}>
          {scene.diagramSpec ? <div style={{width: '100%', height: '100%', transform: 'scale(1.08)'}}><DiagramRenderer spec={scene.diagramSpec} durationInFrames={frames} scribble /></div> : scene.visual ? <PresetVisual visual={scene.visual} durationInFrames={frames} /> : null}
        </div>}
    </div>}
    {scene.subline && <div data-layout-text="subline" style={{position: 'absolute', left: LEFT, top: hasVisual ? 1200 : 1110, width: WIDTH, fontSize: description.fontSize, lineHeight: 1.25, whiteSpace: 'pre-wrap', opacity: reveal(frame, 22)}}>{description.text}</div>}
    <Rule top={1370} progress={lines} width={overlay ? 580 : WIDTH} />
    <div data-layout="caption" style={{position: 'absolute', left: LEFT, top: 1410, width: overlay ? 580 : WIDTH, height: 144}}>
      <div data-layout-text="caption" style={{fontSize: caption.fontSize, lineHeight: 1.25, fontWeight: 700, whiteSpace: 'pre-wrap'}}>{(() => {
        const keyword = cue && 'keyword' in cue && typeof cue.keyword === 'string' ? cue.keyword : null;
        const start = keyword ? caption.text.indexOf(keyword) : -1;
        return start < 0 || !keyword ? caption.text : <>{caption.text.slice(0, start)}<span style={{textDecoration: 'underline', textDecorationColor: ACCENT, textDecorationThickness: 5, textUnderlineOffset: 9}}>{keyword}</span>{caption.text.slice(start + keyword.length)}</>;
      })()}</div>
    </div>
    </AbsoluteFill>
  </AbsoluteFill>;
};

export const NotebookGridVideo: React.FC<RenderManifest> = ({scenes, candidate, source, presenterOverlay}) => {
  validatePresenterOverlay({scenes, presenterOverlay});
  let cursor = 0;
  return <AbsoluteFill style={{background: '#f5f0e6'}}>
    <Img src={staticFile(getTemplate('notebook-grid').background!)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover'}} />
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;} @font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;}`}</style>
    {scenes.map((scene, index) => {
      const from = cursor, frames = previewSceneFrames(scene); cursor += frames;
      return <Sequence key={index} from={from} durationInFrames={frames}>
        <NotebookScene scene={scene} index={index} title={candidate.title || source.title} overlay={presenterOverlay != null} />
        {scene.audioPath && <Html5Audio src={staticFile(scene.audioPath)} />}
      </Sequence>;
    })}
    {presenterOverlay && <PersistentPresenter scenes={scenes} options={presenterOverlay} offsetY={CONTENT_OFFSET_Y} />}
  </AbsoluteFill>;
};
