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
  kind: SceneKind;
  layout?: SceneLayout;
  visual?: SceneVisual;
  headline: string;
  subline: string | null;
  narration: string;
  imageQuery: string | null;
  comparisonLeft: string | null;
  comparisonRight: string | null;
  image: OpenverseImage | null;
};

export type CandidateManifest = {
  schemaVersion: 1 | 2;
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
    theme: 'monochrome-editorial';
    imagePlacement?: 'upper-right';
    textPlacement?: 'lower-left';
    visualDensity?: 'high';
    subtitles?: 'burned-in';
  };
  scenes: CandidateScene[];
};

export type RenderScene = CandidateScene & {
  imagePath: string | null;
  audioPath: string | null;
  audioDurationSeconds: number | null;
  captions?: CaptionCue[];
};

export type RenderManifest = Omit<CandidateManifest, 'scenes'> & {
  scenes: RenderScene[];
};
