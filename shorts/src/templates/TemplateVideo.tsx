import React from 'react';
import type {RenderManifest} from '../types';
import {ShortVideo} from '../ShortVideo';
import {NotebookGridVideo} from './NotebookGridVideo';
import {resolveTemplate} from './registry';

export const TemplateVideo: React.FC<RenderManifest> = props => {
  const template = resolveTemplate(props);
  return template.renderer === 'notebook' ? <NotebookGridVideo {...props} /> : <ShortVideo {...props} />;
};
