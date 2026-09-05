import React, {useEffect, useRef} from 'react';
import {continueRender, delayRender, cancelRender} from 'remotion';
import {diagramState, type DiagramSpec} from './diagram-spec';

// Render one isolated Motion Canvas scene for each requested frame. This avoids
// seek races and makes parallel/out-of-order Remotion renders deterministic.
export const MotionCanvasDiagram: React.FC<{spec: DiagramSpec; progress: number}> = ({spec, progress}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const handle = delayRender('Motion Canvas diagram');
    let cancelled = false;
    let dispose = () => {};
    (async () => {
      const core = await import('@motion-canvas/core');
      const {makeScene2D, Rect, Circle, Line, Txt, Node} = await import('@motion-canvas/2d');
      const states = diagramState(spec, progress);
      const description = makeScene2D(function* (view) {
        for (const node of states) {
          const group = new Node({x: node.x - 400, y: node.y - 280, rotation: node.rotation, scale: node.scale, opacity: node.opacity});
          view.add(group);
          const fill = node.fill === 'white' ? '#fff' : node.fill === 'gray' ? '#858585' : null;
          const props = {width: node.width, height: node.height, fill, stroke: '#fff', lineWidth: 3};
          if (node.shape === 'rect') group.add(new Rect(props));
          if (node.shape === 'circle') group.add(new Circle(props));
          if (node.shape === 'line') group.add(new Line({points: [[-node.width / 2, 0], [node.width / 2, 0]], stroke: '#fff', lineWidth: 3}));
          if (node.label) group.add(new Txt({text: node.label, fontFamily: 'Pretendard', fontSize: 28, fontWeight: 800, fill: node.shape !== 'text' && node.fill === 'white' ? '#050505' : '#fff'}));
        }
        yield;
      });
      const logger = new core.Logger();
      const sharedWebGLContext = new core.SharedWebGLContext(logger);
      dispose = () => sharedWebGLContext.dispose();
      const scene = new description.klass({
        ...description, name: 'diagram', size: new core.Vector2(800, 560), resolutionScale: 1,
        playback: new core.PlaybackStatus(new core.PlaybackManager()), logger,
        timeEventsClass: core.ReadOnlyTimeEvents, sharedWebGLContext,
      } as ConstructorParameters<typeof description.klass>[0]);
      await document.fonts.load('800 28px Pretendard');
      await scene.reset();
      const stage = new core.Stage();
      stage.configure({size: new core.Vector2(800, 560), resolutionScale: 1, background: null});
      await stage.render(scene, null);
      if (!cancelled) {
        const context = canvas.current?.getContext('2d');
        if (!context) throw new Error('Canvas context unavailable');
        context.clearRect(0, 0, 800, 560);
        context.drawImage(stage.finalBuffer, 0, 0);
      }
    })().catch((error) => {if (!cancelled) cancelRender(error);}).finally(() => {dispose(); continueRender(handle);});
    return () => {cancelled = true;};
  }, [spec, progress]);
  return <canvas ref={canvas} width={800} height={560} style={{width: '100%', height: '100%'}} />;
};
