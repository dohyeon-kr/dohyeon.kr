import test from 'node:test';
import assert from 'node:assert/strict';
import {zodTextFormat} from 'openai/helpers/zod';
import {CandidateSchema} from '../scripts/generate-candidates.mjs';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {evaluatedDiagramState,validateDiagramLayout} from '../src/visuals/physics.ts';
import {notebookDiagrams,notebookPreviewProps} from '../src/notebook-preview.ts';
import {PresenterOverlaySchema,validatePresenterOverlay,overlayVisible} from '../src/presenter/overlay.ts';
test('schema defaults, bounded allowance and opt-in sticker contract',()=>{
  const spec=notebookDiagrams[0];
  assert.equal(validateDiagram({...spec,notebook:{theme:'error-notebook'}}).notebook.maxStickerOverlap,.2);
  for(const value of [-.01,.41,NaN]) assert.throws(()=>validateDiagram({...spec,notebook:{theme:'error-notebook',maxStickerOverlap:value}}));
  assert.throws(()=>validateDiagram({...spec,notebook:null}),/Sticker role/);
  assert.throws(()=>validateDiagram({...spec,nodes:spec.nodes.map(n=>n.role?{...n,shape:'text'}:n)}),/Sticker role/);
  assert.doesNotThrow(()=>zodTextFormat(CandidateSchema,'candidate'));
});
test('preview diagrams pass preflight and every intermediate frame',()=>{
  for(const spec of notebookDiagrams) {
    validateDiagramLayout(validateDiagram(spec));
    for(let frame=0;frame<120;frame++) evaluatedDiagramState(spec,frame/119);
  }
});
test('paper presenter preserves overlay tracks and common CTA hiding',()=>{
  assert.doesNotThrow(()=>validatePresenterOverlay(notebookPreviewProps));
  assert.equal(overlayVisible(notebookPreviewProps.presenterOverlay,{commonPage:'blog-cta-v1'}),false);
  assert.throws(()=>PresenterOverlaySchema.parse({position:'bottom-right',frame:'unknown'}));
});
