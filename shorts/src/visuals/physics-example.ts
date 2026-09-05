import type {DiagramSpec} from './diagram-spec';

export const physicsExample: DiagramSpec = {
  version: 1, renderer: 'auto', description: '시소의 한쪽에 무게가 떨어져 기울어지는 개념적 레버리지 비유',
  nodes: [
    {id: 'beam', shape: 'rect', label: '', x: 400, y: 330, width: 440, height: 20, fill: 'gray'},
    {id: 'weight', shape: 'circle', label: '', x: 540, y: 170, width: 60, height: 60, fill: 'white'},
    {id: 'pivot', shape: 'circle', label: '', x: 400, y: 330, width: 20, height: 20, fill: 'white'},
    {id: 'floor', shape: 'rect', label: '', x: 400, y: 500, width: 700, height: 20, fill: 'gray'},
    {id: 'title', shape: 'text', label: '작은 입력, 커지는 움직임', x: 400, y: 85, width: 600, height: 80, fill: 'none'},
  ],
  events: [],
  physics: {
    seconds: 2, gravity: {x: 0, y: 1},
    bodies: [
      {target: 'beam', isStatic: false, mass: 2, restitution: .1, friction: .8, velocity: {x: 0, y: 0}},
      {target: 'weight', isStatic: false, mass: 8, restitution: .1, friction: .8, velocity: {x: 0, y: 0}},
      {target: 'floor', isStatic: true, mass: 1, restitution: .1, friction: .8, velocity: {x: 0, y: 0}},
    ],
    pins: [{target: 'beam', x: 400, y: 330}],
  },
};

