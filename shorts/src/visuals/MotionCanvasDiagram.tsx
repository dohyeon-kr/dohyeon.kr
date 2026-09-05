import React, {useLayoutEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {continueRender, delayRender} from 'remotion';
import type {DiagramSpec} from './diagram-spec';
import {evaluatedDiagramState} from './physics';
import {linePoints, nodeLabel, LABEL_LINE_HEIGHT} from './node-layout';

// Render one isolated Motion Canvas scene for each requested frame. This avoids
// seek races and makes parallel/out-of-order Remotion renders deterministic.
export const MotionCanvasDiagram: React.FC<{spec: DiagramSpec; progress: number; failAsync?: boolean}> = ({spec, progress, failAsync}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<Error | null>(null);
  useLayoutEffect(() => {
    const handle = delayRender('Motion Canvas diagram');
    let cancelled = false;
    let dispose = () => {};
    (async () => {
      const core = await import('@motion-canvas/core');
      if (failAsync) throw new Error('Injected async Motion Canvas failure for CI');
      const {ReadOnlyTimeEvents} = await import('@motion-canvas/core/lib/scenes/timeEvents/ReadOnlyTimeEvents');
      const {makeScene2D, Scene2D, Rect, Circle, Line, Txt, Node, Pattern} = await import('@motion-canvas/2d');
      const tile = document.createElement('canvas');
      tile.width = tile.height = 16;
      const ink = tile.getContext('2d')!;
      ink.strokeStyle = '#858585'; ink.lineWidth = 2;
      for (const offset of [-16, 0, 16]) {ink.beginPath(); ink.moveTo(offset, 16); ink.lineTo(offset + 16, 0); ink.stroke();}
      const hatch = new Pattern({image: tile, repetition: 'repeat'});
      const states = evaluatedDiagramState(spec, progress);
      const description = makeScene2D(function* (view) {
        for (const node of states) {
          const group = new Node({x: node.x - 400, y: node.y - 280, rotation: node.rotation, scale: node.scale, opacity: node.opacity});
          view.add(group);
          const fill = node.fill === 'white' ? '#fff' : node.fill === 'gray' ? '#303030' : node.fill === 'hatch' ? hatch : null;
          const props = {width: node.width, height: node.height, fill, stroke: '#fff', lineWidth: 3, lineDash: node.strokeStyle === 'dashed' ? [12, 10] : []};
          if (node.shape === 'rect') group.add(new Rect(props));
          if (node.shape === 'circle') group.add(new Circle(props));
          if (node.shape === 'line') group.add(new Line({points: linePoints(node), stroke: '#fff', lineWidth: 3, lineDash: node.strokeStyle === 'dashed' ? [12, 10] : []}));
          const label = nodeLabel(node);
          if (node.label) group.add(new Txt({text: label.text, y: label.y, fontFamily: 'Pretendard', fontSize: label.fontSize, lineHeight: label.fontSize * LABEL_LINE_HEIGHT, textAlign: 'center', fontWeight: 800, fill: node.shape !== 'text' && node.fill === 'white' ? '#050505' : '#fff'}));
        }
        yield;
      });
      const logger = new core.Logger();
      const sharedWebGLContext = new core.SharedWebGLContext(logger);
      dispose = () => sharedWebGLContext.dispose();
      const scene = new Scene2D({
        ...description, name: 'diagram', size: new core.Vector2(800, 560), resolutionScale: 1,
        playback: new core.PlaybackStatus(new core.PlaybackManager()), logger,
        timeEventsClass: ReadOnlyTimeEvents, sharedWebGLContext,
        get variables() {return scene.variables;},
        onReplaced: new core.ValueDispatcher(null!),
      });
      dispose = () => {scene.getView().dispose(); sharedWebGLContext.dispose();};
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
    })().catch((cause) => {
      // Commit the error boundary's fallback before releasing capture.
      if (!cancelled) flushSync(() => setError(cause instanceof Error ? cause : new Error(String(cause))));
    }).finally(() => {dispose(); continueRender(handle);});
    return () => {cancelled = true;};
  }, [spec, progress, failAsync]);
  if (error) throw error;
  return <canvas ref={canvas} width={800} height={560} style={{width: '100%', height: '100%'}} />;
};

