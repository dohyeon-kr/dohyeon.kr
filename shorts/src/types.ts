export type SceneKind = 'hero' | 'photo' | 'compare' | 'statement' | 'outro';

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

export type CandidateScene = {
  kind: SceneKind;
  headline: string;
  subline: string | null;
  narration: string;
  imageQuery: string | null;
  comparisonLeft: string | null;
  comparisonRight: string | null;
  image: OpenverseImage | null;
};

export type CandidateManifest = {
  schemaVersion: 1;
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
    imagePlacement: 'upper-right';
    textPlacement: 'lower-left';
  };
  scenes: CandidateScene[];
};

export type RenderScene = CandidateScene & {
  imagePath: string | null;
  audioPath: string | null;
  audioDurationSeconds: number | null;
};

export type RenderManifest = Omit<CandidateManifest, 'scenes'> & {
  scenes: RenderScene[];
};
