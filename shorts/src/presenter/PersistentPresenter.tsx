import React, {createContext, useLayoutEffect, useMemo, useRef} from 'react';
import {cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {Presenter} from './Presenter';
import {compilePresenter} from './api';
import {PRESENTER_OVERLAY_BOX, overlayTimeline, overlayVisible, type PresenterOverlaySpec} from './overlay';
import type {RenderScene} from '../types';

export const PresenterOverlayContext = createContext(false);
const idle = compilePresenter({});

// Mounted outside scene sequences: transitions never fade, move or duplicate it.
export const PersistentPresenter: React.FC<{scenes: RenderScene[]; options: PresenterOverlaySpec}> = ({scenes, options}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), root = useRef<HTMLDivElement>(null);
  const timeline = useMemo(() => overlayTimeline(scenes, options, fps).map(entry => ({...entry, evaluate: compilePresenter(entry.tracks, entry.duration)})), [scenes, options, fps]);
  const active = timeline.find(entry => frame >= entry.start && frame < entry.end);
  const visible = active != null && overlayVisible(options, active.scene);
  const pose = active ? active.evaluate((frame - active.start) / fps) : idle(frame / fps);
  const globalPose = idle(frame / fps);
  pose.blink = globalPose.blink; pose.inkFrame = globalPose.inkFrame;
  useLayoutEffect(() => {
    const handle = delayRender('Check persistent presenter clearance');
    let cancelled = false;
    document.fonts.load('800 36px Pretendard').then(async () => {
      await document.fonts.ready;
      if (cancelled || !root.current) return;
      const box = root.current.getBoundingClientRect();
      const container = root.current.parentElement!;
      for (const el of container.querySelectorAll('[data-layout-text], [data-overlay-reserve]')) {
        let visible = true;
        for (let p: Element | null = el; p && p !== container; p = p.parentElement) {
          if (Number(getComputedStyle(p).opacity) === 0) visible = false;
        }
        if (!visible) continue;
        const rect = el.getBoundingClientRect();
        if (rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top) {
          throw new Error(`[layout:presenter] frame=${frame}: presenter overlaps ${el.getAttribute('data-layout-text') ?? 'reserved content'}`);
        }
      }
    }).catch(error => {if (!cancelled) cancelRender(error);}).finally(() => continueRender(handle));
    return () => {cancelled = true;};
  }, [frame, visible]);
  if (!visible) return null;
  return <div ref={root} data-presenter-overlay="bottom-right" style={{position:'absolute', ...PRESENTER_OVERLAY_BOX, borderRadius:'50%', overflow:'hidden', zIndex:100, pointerEvents:'none'}}>
    <Presenter pose={pose} />
  </div>;
};
