import type {DiagramSpec} from './visuals/diagram-spec';
export type SceneKind = 'hero' | 'photo' | 'compare' | 'statement' | 'outro';

export type SceneLayout =
  | 'photo-top-right'
  | 'photo-full-bleed'
  | 'photo-split-left'
  | 'photo-strip'
  | 'diagram-centered'
  | 'symbol-right'
  | 'statement-giant'
  | 'statement-offset'
  | 'compare-columns'
  | 'compare-versus'
  | 'outro-minimal';

export type VisualType = 'photo' | 'diagram' | 'symbol' | 'number' | 'none';

export type SceneTransition = 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'wipe' | 'none';

export type SubtitleEmphasis = 'low' | 'mid' | 'high';
export type SubtitleDelivery = 'normal' | 'push' | 'hold' | 'drop';
export type VisualPriority = 'low' | 'mid' | 'high';

export type SubtitleBeat = {
  text: string;
  emphasis: SubtitleEmphasis;
  pauseAfterMs: number;
  delivery: SubtitleDelivery;
  visualPriority: VisualPriority;
  keyword: string | null;
  visualCue: string | null;
};

export type VisualRelationType =
  | 'literal'
  | 'comparison'
  | 'change-over-time'
  | 'small-input-large-output'
  | 'accumulation'
  | 'bottleneck'
  | 'convergence'
  | 'divergence'
  | 'flow'
  | 'balance'
  | 'zoom-depth'
  | 'network-growth';

export type VisualStrategyType =
  | 'simulation'
  | 'graph'
  | 'spatial-diagram'
  | 'physical-metaphor'
  | 'photo'
  | 'icon'
  | 'number'
  | 'minimal';

export type VisualIntent = {
  concept: string;
  relation: {
    type: VisualRelationType;
    description: string | null;
  };
  strategy: {
    type: VisualStrategyType;
    metaphor: string | null;
    rationale: string;
  };
};

export type CameraMotion = 'static' | 'push-in' | 'pull-out' | 'zoom' | 'pan-left' | 'pan-right';
export type CameraTarget = 'center' | 'endpoint' | 'inflection' | 'subject' | 'detail';

export type SceneCamera = {
  motion: CameraMotion;
  target: CameraTarget;
  intensity: 'subtle' | 'medium';
  startProgress: number;
  endProgress: number;
};

export type SceneVisual = {
  type: VisualType;
  motif: string | null;
  query: string | null;
  value: string | null;
  xLabel: string | null;
  yLabel: string | null;
};

export type OpenverseImage = {
  query: string;
  title: string | null;
  creator: string | null;
  license: string;
  licenseVersion: string | null;
  licenseUrl: string | null;
  source: string | null;
  provider: string | null;
  sourcePage: string | null;
  originalUrl: string | null;
  thumbnailUrl: string | null;
};

export type CaptionCue = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type CandidateScene = {
  visualResolution?: {status: 'fallback'; originalQuery: string | null; reason: 'photo-unavailable' | 'invalid-diagram'; detail?: string};
  visualStory?: {initial: string; trigger: string; change: string; invariant: string; result: string} | null;
  diagramSpec?: DiagramSpec | null;
  kind: SceneKind;
  layout?: SceneLayout;
  visual?: SceneVisual;
  visualIntent?: VisualIntent | null;
  transition?: SceneTransition;
  camera?: SceneCamera | null;
  choreography?: string[];
  beats?: SubtitleBeat[];
  headline: string;
  subline: string | null;
  narration: string;
  imageQuery: string | null;
  comparisonLeft: string | null;
  comparisonRight: string | null;
  image: OpenverseImage | null;
};

export type CandidateManifest = {
  schemaVersion: 1 | 2 | 3;
  id: string;
  status: 'candidate';
  source: {
    url: string;
    title: string;
  };
  candidate: {
    angle: string;
    hook: string;
    title: string;
    rationale: string;
    viralScore: number;
    suggestedCaption: string;
    hashtags: string[];
  };
  style: {
    theme: 'monochrome-editorial' | 'monochrome-editorial-dark';
    imagePlacement?: 'upper-right';
    textPlacement?: 'lower-left';
    visualDensity?: 'high';
    subtitles?: 'burned-in';
    safeArea?: 'shorts-reels';
    artDirection?: 'monochrome-editorial-motion';
    motionLanguage?: 'sharp-subtle';
    decorativeLabels?: 'forbidden';
  };
  scenes: CandidateScene[];
};

export type RenderScene = CandidateScene & {
  beatTimings?: Array<{startSeconds: number; endSeconds: number}>;
  diagramFramesPath?: string | null;
  imagePath: string | null;
  audioPath: string | null;
  audioDurationSeconds: number | null;
  captions?: CaptionCue[];
};

export type RenderManifest = Omit<CandidateManifest, 'scenes'> & {
  scenes: RenderScene[];
};
