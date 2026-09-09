import React from 'react';
import type {RenderManifest} from '../types';
import {ShortVideo} from '../ShortVideo';
import {NotebookGridVideo} from './NotebookGridVideo';
import {resolveTemplate} from './registry';

export const TemplateVideo: React.FC<RenderManifest> = props => {
  const template = resolveTemplate(props);
  if (template.renderer !== 'notebook' && props.scenes.some(s => s.uiMotion)) throw new Error('uiMotion requires notebook-grid');
  return template.renderer === 'notebook' ? <NotebookGridVideo {...props} /> : <ShortVideo {...props} />;
};

