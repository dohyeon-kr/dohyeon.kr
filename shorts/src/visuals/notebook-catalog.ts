// Canonical atlas crops shared by both engines and the authoring interface.
export const NOTEBOOK_ASSETS={
  highlighter:{assetPath:'stickers/highlighter.webp',file:'papers.webp',sheet:[1536,1024],crop:[1020,684,511,130]},
  paper:{assetPath:'stickers/paper.webp',file:'papers.webp',sheet:[1536,1024],crop:[24,576,496,339]},
  blue:{assetPath:'stickers/blue.webp',file:'papers.webp',sheet:[1536,1024],crop:[526,155,491,354]},
  tape:{assetPath:'stickers/tape.webp',file:'papers.webp',sheet:[1536,1024],crop:[537,565,438,190]},
  check:{assetPath:'stickers/check.webp',file:'marks.webp',sheet:[1254,1254],crop:[476,20,310,320]},
  star:{assetPath:'stickers/star.webp',file:'marks.webp',sheet:[1254,1254],crop:[468,623,344,289]},
  underline:{assetPath:'stickers/underline.webp',file:'marks.webp',sheet:[1254,1254],crop:[15,412,464,158]},
} as const;
export type StickerAsset=keyof typeof NOTEBOOK_ASSETS;

// Coverage is measured against the sticker footprint, not the target or IoU.
export const STICKER_ATTACHMENTS = {
  'edge-note': {assets:['paper','blue'] as readonly string[], min:.08, max:.2, usage:'짧은 조건이나 수정 메모를 객체 가장자리에 8–20% 걸친다.'},
  tape: {assets:['tape'] as readonly string[], min:.35, max:.65, usage:'지정한 사진·카드 가장자리에 35–65% 걸쳐 고정한다. 글자는 피한다.'},
  badge: {assets:['check','star'] as readonly string[], min:.05, max:.15, usage:'확인·선택한 결과 모서리에 5–15% 걸친다.'},
} as const;
export const STICKER_USAGE = {
  paper: '조건·질문·수정 메모. 짧은 라벨 허용.',
  blue: '선택한 버전·결론 메모. 흰 글자의 짧은 라벨 허용.',
  tape: '사진·카드 고정. 라벨 없음. 두 모서리까지.',
  check: '실제로 확인·선택한 항목. 라벨 없음.',
  star: '동료의 반응이나 발견한 점. 성과를 지어내지 않는다. 라벨 없음.',
  underline: '짧은 제목 아래. 받침에서 최소 12px 띄운다. 라벨 없음.',
  highlighter: '자막 keyword 뒤에만 50% 합성. 독립 diagram node가 아니다.',
} as const;
