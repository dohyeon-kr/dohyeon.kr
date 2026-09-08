import type {DiagramSpec} from './visuals/diagram-spec';
import type {RenderManifest, RenderScene} from './types';
import {templatePreviewProps} from './template-preview.ts';
import {createBlogCta} from '../scripts/blog-cta.mjs';
const node=(id:string,label:string,x:number,y:number,width=200,height=120):DiagramSpec['nodes'][number]=>({id,label,x,y,width,height,shape:'rect',fill:'none'});
const edge=(id:string,source:string,target:string):DiagramSpec['nodes'][number]=>({id,shape:'line',label:'',x:400,y:280,width:100,height:1,fill:'none',connector:{source,target,sourceSide:'bottom',targetSide:'top',gap:8}});
const base={version:1,renderer:'auto',notebook:{theme:'error-notebook',maxStickerOverlap:.2}} as const;
export const notebookDiagrams:DiagramSpec[]=[
  {...base,description:'프론트엔드가 사용할 SDK 버전을 선택한다',nodes:[
    edge('selected-version','v1','app'),node('v1','v1',220,190),node('v2','v2',560,190),node('app','앱',220,410),
    {...node('selected','선택',320,112,120,78),role:'sticker',stickerAsset:'paper',fill:'white'},
  ],events:[{target:'selected',property:'opacity',from:0,to:1,start:.15,end:.3},{target:'selected-version',property:'opacity',from:0,to:1,start:.35,end:.5}]},
  {...base,description:'클라이언트 트레이스를 백엔드까지 연결한다',nodes:[
    edge('trace','client','server'),node('client','클라이언트',290,150,300),node('server','백엔드',290,410,300),
    {...node('trace-check','',635,115,95,90),role:'sticker',stickerAsset:'check'},
    {...node('trace-label','traceparent',565,280,270,80),shape:'text'},
  ],events:[{target:'trace',property:'opacity',from:0,to:1,start:.25,end:.4}]},
  {...base,description:'대화에서 정한 내용을 티켓과 PR에 남긴다',nodes:[
    edge('record','talk','ticket'),{...node('talk','대화',290,140,220,130),shape:'circle'},node('ticket','티켓 · PR',290,395,280,130),
    {...node('record-star','',620,115,85,85),role:'sticker',stickerAsset:'star'},
    {...node('fields','내용\n이유\n상태',580,395,150,210),shape:'text'},
  ],events:[{target:'record',property:'opacity',from:0,to:1,start:.2,end:.35},{target:'fields',property:'opacity',from:0,to:1,start:.45,end:.6}]},
];
const captions=['SDK 업데이트 시점을\n직접 선택합니다.','같은 요청의 기록을\n함께 따라갑니다.','대화에서 정한 내용을\n티켓과 PR에 남깁니다.'];
export const notebookPreviewProps:RenderManifest={...templatePreviewProps,id:'error-notebook-preview',
  presenterOverlay:{position:'bottom-right',frame:'circle',hideOnCommonCta:true,lipSync:'none',nod:'none'},
  scenes:[...notebookDiagrams.map((diagramSpec,i):RenderScene=>({
    ...templatePreviewProps.scenes[0],headline:['SDK 버전 관리','요청 추적','대화와 기록'][i],subline:null,layout:'diagram-centered',transition:'fade',
    visual:{type:'diagram',motif:null,query:null,value:null,xLabel:null,yLabel:null},diagramSpec,beats:[],
    narration:'',captions:[{startSeconds:0,endSeconds:4,text:captions[i]}],audioDurationSeconds:4,
    overlayPresenter:{actions:[{name:'explain',start:.4,end:3.5,intensity:.4}],expressions:[{name:'smile',start:.4,end:3.5}]},
  })),{...templatePreviewProps.scenes[0],...createBlogCta(),audioDurationSeconds:6} as RenderScene],
};
