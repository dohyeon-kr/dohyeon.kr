import {useLayoutEffect, type RefObject} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';

// Measure after fonts load, before Remotion captures the current frame.
// Region metadata is explicit: photo backgrounds intentionally share text space.
export function useLayoutCheck(root: RefObject<HTMLDivElement | null>, frame: number) {
  useLayoutEffect(() => {
    const handle = delayRender('Measure scene text and layout');
    let cancelled = false;
    document.fonts.load('800 36px Pretendard').then(async fonts => {
      await document.fonts.ready;
      if (!fonts.length) throw new Error('[layout:font] Pretendard is unavailable');
      if (cancelled || !root.current) return;
      const el = root.current, canvas = el.getBoundingClientRect();
      const visible = (element: Element) => {
        for (let current: Element | null = element; current && current !== el; current = current.parentElement) {
          if (Number(getComputedStyle(current).opacity) === 0) return false;
        }
        return true;
      };
      const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5;
      const text = [...el.querySelectorAll<HTMLElement>('[data-layout-text]')].filter(visible).map(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return {id: element.dataset.layoutText!, rect: range.getBoundingClientRect()};
      }).filter(item => item.rect.width > 0 && item.rect.height > 0);
      const fail = (message: string) => {throw new Error(`[layout:measured] frame=${frame}: ${message}`);};
      for (const {id, rect} of text) {
        if (rect.left < canvas.left - .5 || rect.right > canvas.right + .5 || rect.top < canvas.top - .5 || rect.bottom > canvas.bottom + .5) fail(`${id} leaves the canvas`);
      }
      for (let i = 0; i < text.length; i++) for (let j = i + 1; j < text.length; j++) {
        if (overlap(text[i].rect, text[j].rect)) fail(`${text[i].id} overlaps ${text[j].id}`);
      }
      for (const visual of el.querySelectorAll('[data-layout="visual"]')) {
        if (!visible(visual)) continue;
        for (const item of text) if (!visual.contains(el.querySelector(`[data-layout-text="${item.id}"]`)) && overlap(item.rect, visual.getBoundingClientRect())) fail(`${item.id} overlaps visual region`);
      }
      for (const caption of el.querySelectorAll('[data-layout="caption"]')) {
        const region = caption.getBoundingClientRect();
        const item = text.find(t => t.id === 'caption');
        if (item && (item.rect.bottom > region.bottom + .5 || item.rect.right > region.right + .5)) fail('caption overflows its reserved region');
      }
    }).catch(error => {if (!cancelled) cancelRender(error);}).finally(() => continueRender(handle));
    return () => {cancelled = true;};
  }, [root, frame]);
}
