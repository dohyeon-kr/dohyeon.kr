// Animation-only readings, not replacements for narration/captions or measured G2P.
// Unknown Latin words and numbers deliberately use documented approximations.
const letters = ['에이','비','씨','디','이','에프','지','에이치','아이','제이','케이','엘','엠','엔','오','피','큐','알','에스','티','유','브이','더블유','엑스','와이','지'];
const digits = ['영','일','이','삼','사','오','육','칠','팔','구'];
const terms: Record<string, string> = {
  sdk:'에스디케이', api:'에이피아이', pr:'피알', ui:'유아이', ux:'유엑스',
  bruno:'브루노', git:'깃', github:'깃허브', traceparent:'트레이스페어런트',
  react:'리액트', next:'넥스트', typescript:'타입스크립트', javascript:'자바스크립트',
  openapi:'오픈에이피아이', opentelemetry:'오픈텔레메트리', signoz:'시그노즈',
  jira:'지라', node:'노드', code:'코드', json:'제이슨', sql:'에스큐엘',
};
export class UnsupportedSpeechTextError extends Error {
  readonly code = 'UNSUPPORTED_SPEECH_TEXT';
  constructor(word: string) {super(`Unsupported speech text for presenter: ${word}`);}
}
export type SpeechReading = {
  text: string;
  substitutions: {source: string; reading: string; method: 'lexicon' | 'letter-names' | 'digit-names' | 'decimal-point'}[];
};
export function speechReading(word: string): SpeechReading {
  const substitutions: SpeechReading['substitutions'] = [];
  // Normalize decomposed Hangul and full-width Latin/digits; preserve token boundaries
  // until each run has been handled (API/SDK must not become one unknown word).
  const input = word.normalize('NFKC');
  const text = input.replace(/[A-Za-z]+|\d+(?:\.\d+)?/g, source => {
    let reading: string;
    let method: SpeechReading['substitutions'][number]['method'];
    if (/^[A-Za-z]+$/.test(source)) {
      const known = Object.hasOwn(terms, source.toLowerCase()) ? terms[source.toLowerCase()] : undefined;
      reading = known ?? [...source.toUpperCase()].map(c => letters[c.charCodeAt(0) - 65]).join('');
      method = known ? 'lexicon' : 'letter-names';
    } else {
      reading = [...source].map(c => c === '.' ? '점' : digits[Number(c)]).join('');
      method = source.includes('.') ? 'decimal-point' : 'digit-names';
    }
    substitutions.push({source, reading, method});
    return reading;
  }).replace(/[\s\p{P}\p{S}]/gu, '');
  if (text && !/^[가-힣]+$/.test(text)) throw new UnsupportedSpeechTextError(word);
  return {text, substitutions};
}
