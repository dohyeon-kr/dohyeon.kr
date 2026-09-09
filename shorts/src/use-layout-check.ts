import {useLayoutEffect, type RefObject} from 'react';
import {coveredRatio, HEADLINE_OVERLAP_LIMIT} from './layout-overlap';
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
        return {id: element.dataset.layoutText!, element, rect: range.getBoundingClientRect(), assetScene: element.closest('[data-layout-overlap="assets"]')};
      }).filter(item => item.rect.width > 0 && item.rect.height > 0);
      const fail = (message: string) => {throw new Error(`[layout:measured] frame=${frame}: ${message}`);};
      for (const {id, rect} of text) {
        if (rect.left < canvas.left - .5 || rect.right > canvas.right + .5 || rect.top < canvas.top - .5 || rect.bottom > canvas.bottom + .5) fail(`${id} leaves the canvas`);
      }
      for (let i = 0; i < text.length; i++) for (let j = i + 1; j < text.length; j++) {
        // Asset labels may occlude each other within one layered UI composition.
        if (text[i].assetScene && text[i].assetScene === text[j].assetScene) continue;
        // Headline/asset intersections are aggregated below.
        if ((text[i].id === 'headline' && text[j].assetScene) || (text[j].id === 'headline' && text[i].assetScene)) continue;
        if (overlap(text[i].rect, text[j].rect)) fail(`${text[i].id} overlaps ${text[j].id}`);
      }
      for (const visual of el.querySelectorAll('[data-layout="visual"]')) {
        if (!visible(visual)) continue;
        const isAssetScene = !!visual.querySelector('[data-layout-overlap="assets"]');
        for (const item of text) {
          if (visual.contains(item.element)) continue;
          if (item.id === 'headline' && isAssetScene) continue;
          if (overlap(item.rect, visual.getBoundingClientRect())) fail(`${item.id} overlaps visual region`);
        }
      }
      const headline = text.find(item => item.id === 'headline');
      if (headline) {
        const scenes = [...el.querySelectorAll<HTMLElement>('[data-layout-overlap="assets"]')].filter(visible);
        const obstacles = scenes.flatMap(scene => [...scene.querySelectorAll('[data-notebook-ui-asset]')].filter(visible).map(asset => asset.getBoundingClientRect()));
        const limits = scenes.map(scene => {
          const value = Number(scene.dataset.headlineOverlapLimit ?? HEADLINE_OVERLAP_LIMIT);
          return Number.isFinite(value) ? Math.max(0, Math.min(HEADLINE_OVERLAP_LIMIT,value)) : 0;
        });
        const limit = Math.min(HEADLINE_OVERLAP_LIMIT,...limits);
        const ratio = coveredRatio(headline.rect,obstacles);
        if (ratio > limit+1e-9) fail(`headline covered by assets ${(ratio*100).toFixed(2)}% > ${limit*100}%`);
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
