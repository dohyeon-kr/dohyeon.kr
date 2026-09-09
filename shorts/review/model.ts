import {validateDiagram} from '../src/visuals/diagram-spec.ts';
export const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));


export type Layout={dx:number;dy:number;scale:number};
export type Draft={version:1;sourceFingerprint:string;candidate:any;layouts:Record<string,Layout>;notes:Record<string,string>;guidelines:string};
export const fresh=(base:any):Draft=>({version:1,sourceFingerprint:JSON.stringify(base),candidate:clone(base),layouts:{},notes:{},guidelines:'전체 주제 제목을 유지합니다.\n존댓말의 경험 에세이로 씁니다.\n손글씨 없이 Pretendard를 사용합니다.\n종이는 전체 화면에, 사진은 테이프로 붙입니다.'});
export function parseDraft(raw:string,base:any):Draft{
 const fingerprint=JSON.stringify(base);
 const d=JSON.parse(raw);if(d.version!==1||d.sourceFingerprint!==fingerprint||!Array.isArray(d.candidate?.scenes)||d.candidate.scenes.length!==base.scenes.length)throw Error('이 candidate 버전의 검수 JSON이 아닙니다.');
 if(!d.layouts||!d.notes||typeof d.guidelines!=='string')throw Error('검수 데이터가 불완전합니다.');
 for(const v of Object.values(d.layouts) as Layout[])if(!v||![v.dx,v.dy,v.scale].every(Number.isFinite)||v.scale<.25||v.scale>2)throw Error('배치 값이 올바르지 않습니다.');
 for(const v of Object.values(d.notes))if(typeof v!=='string')throw Error('메모는 문자열이어야 합니다.');
 // Only geometry edits are imported; narration and scene identity stay tied to the source snapshot.
 const expected=clone(base);d.candidate.scenes.forEach((s:any,i:number)=>{if(s.diagramSpec){validateDiagram(s.diagramSpec);expected.scenes[i].diagramSpec=s.diagramSpec;}});
 if(JSON.stringify(expected)!==JSON.stringify(d.candidate))throw Error('지원하지 않는 candidate 필드 변경이 있습니다.');
 return d;
}
