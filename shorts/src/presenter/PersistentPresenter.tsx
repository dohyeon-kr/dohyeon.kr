import React, {createContext, useLayoutEffect, useRef} from 'react';
import {cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {Presenter} from './Presenter';
import {compilePresenter} from './api';
import {PRESENTER_OVERLAY_BOX} from './overlay';

export const PresenterOverlayContext = createContext(false);
const evaluate = compilePresenter({});

// Mounted outside scene sequences: transitions never fade, move or duplicate it.
export const PersistentPresenter: React.FC = () => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), root = useRef<HTMLDivElement>(null);
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
  }, [frame]);
  return <div ref={root} data-presenter-overlay="bottom-right" style={{position:'absolute', ...PRESENTER_OVERLAY_BOX, borderRadius:'50%', overflow:'hidden', zIndex:100, pointerEvents:'none'}}>
    <Presenter pose={evaluate(frame / fps)} />
  </div>;
};
