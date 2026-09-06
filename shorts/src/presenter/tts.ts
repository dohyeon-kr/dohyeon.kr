import {validatePresenter, type MouthCue} from './schema.ts';
import type {MouthShape} from './vocabulary.ts';
/** Provider-neutral adapter: timestamps must describe the FINAL rate-adjusted audio. */
export type TimedPhoneme = {start:number;end:number;symbol:string};
const shapes: Record<string,MouthShape> = {
  'ㅗ':'O','ㅜ':'O',o:'O',u:'O','ʊ':'O','ɔ':'O',
  'ㅣ':'I','ㅡ':'I',i:'I','ɪ':'I','ɯ':'I',
  'ㅏ':'A','ㅓ':'A','ㅐ':'A','ㅔ':'A',a:'A','ɑ':'A','ʌ':'A','ə':'A',e:'A','ɛ':'A',
  'ㅁ':'M','ㅂ':'M','ㅍ':'M',m:'M',b:'M',p:'M',sil:'rest',sp:'rest',
};
export function phonemesToMouthCues(tokens:readonly TimedPhoneme[], duration:number): MouthCue[] {
  const mouths=tokens.map(token=>{
    const shape=shapes[token.symbol];
    if(!shape) throw new Error(`Unsupported phoneme ${token.symbol}: provider adapter must map it explicitly`);
    return {start:token.start,end:token.end,shape,intensity:shape==='rest'||shape==='M' ? 0 : .7};
  });
  return validatePresenter({mouths},duration).mouths!;
}
