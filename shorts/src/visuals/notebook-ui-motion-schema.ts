import {z} from 'zod/v4';
import {notebookUiAssets} from './notebook-ui-assets.ts';
const asset = z.enum(Object.keys(notebookUiAssets) as [keyof typeof notebookUiAssets, ...(keyof typeof notebookUiAssets)[]]);
const progress = z.number().min(0).max(1);
export const NotebookUiMotionSchema = z.object({
  headlineOverlapLimit:z.number().min(0).max(0.05).nullable().optional(),
  version:z.literal(1), width:z.number().positive(), height:z.number().positive(), scribble:z.boolean().nullable().optional(),
  nodes:z.array(z.object({id:z.string().min(1),asset,x:z.number(),y:z.number(),width:z.number().positive(),scale:z.number().positive().max(4).nullable().optional(),rotation:z.number().nullable().optional(),opacity:progress.nullable().optional(),drawProgress:progress.nullable().optional(),layer:z.number().nullable().optional(),label:z.string().nullable().optional(),labelSize:z.number().min(24).nullable().optional()})).min(1).max(24),
  events:z.array(z.object({target:z.string(),property:z.enum(['x','y','scale','rotation','opacity','drawProgress']),from:z.number(),to:z.number(),start:progress,end:progress,easing:z.enum(['linear','smooth']).nullable().optional()})).max(120),
  states:z.array(z.object({target:z.string(),at:progress,asset})).max(40).nullable().optional(),
});
