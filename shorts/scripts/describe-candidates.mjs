import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const labels = {
  hero: '도입', photo: '사진', compare: '비교', statement: '핵심 메시지', outro: '마무리',
  'photo-top-right': '오른쪽 위 사진과 텍스트', 'photo-full-bleed': '사진을 화면 전체에 배치',
  'photo-split-left': '왼쪽 사진과 오른쪽 텍스트', 'photo-strip': '띠 형태의 사진',
  'diagram-centered': '도식을 중앙에 배치', 'symbol-right': '오른쪽에 상징 배치',
  'statement-giant': '큰 문장을 중심에 배치', 'statement-offset': '문장을 비대칭으로 배치',
  'compare-columns': '두 열로 비교', 'compare-versus': '두 대상을 대비', 'outro-minimal': '간결한 마무리',
  simulation: '시뮬레이션', graph: '그래프', 'spatial-diagram': '공간 도식',
  'physical-metaphor': '물리적 비유', icon: '아이콘', number: '숫자', minimal: '문장 중심',
  fade: '서서히 전환', 'slide-up': '위로 밀며 전환', 'slide-left': '왼쪽으로 밀며 전환',
  zoom: '확대', wipe: '쓸어내며 전환', none: '없음', static: '고정',
  'push-in': '다가가기', 'pull-out': '멀어지기', 'pan-left': '왼쪽 이동', 'pan-right': '오른쪽 이동',
  center: '중앙', endpoint: '끝 지점', inflection: '변곡점', subject: '주요 대상', detail: '세부',
  subtle: '약하게', medium: '중간 강도로', low: '약', mid: '중', high: '강',
  normal: '자연스럽게', push: '힘주어', hold: '여운을 두어', drop: '낮추어 마무리',
  'show-visual': '시각 요소 등장', 'show-headline': '주 문구 등장', 'show-subline': '보조 문구 등장',
  'advance-visual': '시각 요소의 변화 진행', 'camera-focus': '핵심 부분에 시선 집중',
  'emphasize-result': '결과 강조', 'hold-question': '질문을 보여주며 잠시 유지',
  rect: '사각형', circle: '원', line: '선', text: '글자',
};
const plain = (value) => String(value ?? '').replace(/\r?\n/g, ' ').trim();
const md = (value) => plain(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/([\\`*_[\]{}|])/g, '\\$1');
const label = (value) => md(labels[value] ?? value ?? '미지정');
const link = (title, url) => {
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) return `[${md(title)}](<${parsed.href}>)`;
  } catch {}
  return md(title);
};

function movement(event, nodes) {
  const node = nodes.find((item) => item.id === event.target);
  const target = md(node?.label || labels[node?.shape] || event.target);
  const up = event.to > event.from;
  const action = event.to === event.from ? '상태 유지' : ({
    x: up ? '오른쪽으로 이동' : '왼쪽으로 이동',
    y: up ? '아래로 이동' : '위로 이동',
    opacity: up ? '점차 드러남' : '점차 흐려짐',
    width: up ? '영역이 넓어짐' : '영역이 좁아짐', height: up ? '영역이 높아짐' : '영역이 낮아짐', scale: up ? '커짐' : '작아짐', rotation: '기울기 변화',
  }[event.property] ?? label(event.property));
  return `${target}: ${action}`;
}

export function describeCandidate(manifest, filename) {
  if (!Array.isArray(manifest.scenes) || !manifest.scenes.length) throw new Error(`${filename}: scenes must be a non-empty array`);
  const c = manifest.candidate ?? {};
  const out = [`# ${md(c.title || manifest.id || filename)}`, '',
    `원본: [${md(filename)}](${encodeURIComponent(filename)})`, '',
    'JSON에서 자동 생성한 검토용 스토리보드입니다. 수정은 원본 JSON에 반영한 뒤 다시 생성하세요. 연출 설명은 기획 의도이며, 실제 배치·동작은 렌더된 스냅샷과 영상으로 확인합니다. 음성 생성 전이므로 재생 시간은 확정하지 않습니다.', '',
    `**첫 문장:** ${md(c.hook)}`, '', `**기획 의도:** ${md(c.rationale)}`, '',
    `**원문:** ${link(manifest.source?.title || '블로그', manifest.source?.url)}`, ''];
  for (const [index, scene] of manifest.scenes.entries()) {
    out.push(`## ${index + 1}. ${label(scene.kind)} — ${md(scene.headline)}`, '',
      '**내레이션**', '', md(scene.narration), '', '**화면 구성**', '',
      `- 주 문구: ${md(scene.headline)}`);
    if (scene.subline) out.push(`- 보조 문구: ${md(scene.subline)}`);
    out.push(`- 배치: ${label(scene.layout)}`);
    if (scene.comparisonLeft || scene.comparisonRight) out.push(`- 비교: ${md(scene.comparisonLeft)} ↔ ${md(scene.comparisonRight)}`);
    const intent = scene.visualIntent;
    if (intent) {
      out.push(`- 전달할 관계: ${md(intent.relation?.description || intent.concept)}`,
        `- 표현 방식: ${label(intent.strategy?.type)}${intent.strategy?.metaphor ? ` — ${md(intent.strategy.metaphor)}` : ''}`);
      if (intent.strategy?.rationale) out.push(`- 표현 이유: ${md(intent.strategy.rationale)}`);
    }
    if (scene.visualResolution?.status === 'fallback') {
      if (scene.visualResolution.reason === 'invalid-diagram') {
        out.push(`- **시각 연출 검토 필요:** 도식 검증에 실패해 텍스트 장면으로 전환했습니다. 사유: ${md(scene.visualResolution.detail)}`);
      } else out.push(`- **시각 연출 검토 필요:** 사진을 찾지 못해 텍스트 장면으로 전환했습니다. 원래 검색어: ${md(scene.visualResolution.originalQuery) || '미지정'}`);
    }
    const visual = scene.visual ?? {};
    if (visual.value) out.push(`- 표시 값: ${md(visual.value)}`);
    if (visual.xLabel || visual.yLabel) out.push(`- 그래프 축: 가로 ${md(visual.xLabel) || '미지정'}, 세로 ${md(visual.yLabel) || '미지정'}`);
    if (visual.type === 'photo' || scene.imageQuery || scene.image) {
      out.push(`- 사진 검색어: ${md(scene.imageQuery || visual.query) || '미지정'}`);
      out.push(scene.image ? `- 사진 출처: ${link(scene.image.title || '원본 페이지', scene.image.sourcePage)} · 라이선스 ${md(scene.image.license)}` : '- 사진 상태: 아직 확보되지 않음');
    }
    const spec = scene.diagramSpec;
    if (spec?.nodes?.length) out.push(`- 도식 구성: ${spec.nodes.map(n => `${label(n.shape)}${n.label ? ` ‘${md(n.label)}’` : ''}`).join(', ')}`);
    out.push('', '**연출 흐름**', '');
    if (scene.visualStory) {
      for (const [key, title] of Object.entries({initial: '시작', trigger: '사건', change: '변화', invariant: '유지', result: '결과'})) out.push(`- ${title}: ${md(scene.visualStory[key])}`);
      out.push('');
    }
    const choreography = scene.choreography ?? [];
    out.push(choreography.length ? choreography.map((item, i) => `${i + 1}. ${labels[item] ? label(item) : `추가 연출 지시: ${md(item)}`}`).join('\n') : '별도 연출 지시 없음');
    if (spec?.events?.length) {
      out.push('', '도식에서 설정된 변화(시작 순서):', '', ...[...spec.events].sort((a, b) => a.start - b.start).map(e => `- ${movement(e, spec.nodes ?? [])}`));
    }
    if (spec?.physics) {
      const nodes = spec.nodes ?? [];
      const name = (id) => md(nodes.find(n => n.id === id)?.label || id);
      out.push('', '물리 시뮬레이션: 중력·충돌 설정에 따라 움직이는 개념적 비유입니다.');
      for (const body of spec.physics.bodies ?? []) out.push(`- ${name(body.target)}: ${body.isStatic ? '고정 물체' : '움직이는 물체'}`);
      for (const pin of spec.physics.pins ?? []) out.push(`- ${name(pin.target)}에 회전 지점 고정`);
    }
    out.push('', `카메라: ${label(scene.camera?.motion)}${scene.camera?.motion && scene.camera.motion !== 'static' ? ` · ${label(scene.camera.target)} · ${label(scene.camera.intensity)}` : ''}`,
      '', `장면 전환: ${label(scene.transition)}`, '', '**자막과 낭독 리듬**', '');
    if (!scene.beats?.length) out.push('의미 단위 자막이 지정되지 않았습니다. 렌더러의 기본 분할 규칙을 사용합니다.');
    for (const [i, beat] of (scene.beats ?? []).entries()) {
      out.push(`${i + 1}. ${beat.emphasis === 'high' ? `**${md(beat.text)}**` : md(beat.text)}`,
        `   - 강조 ${label(beat.emphasis)} · ${label(beat.delivery)} · 뒤에 ${Number(beat.pauseAfterMs ?? 0)}ms 쉼`);
      if (beat.keyword) out.push(`   - 강조 단어: **${md(beat.keyword)}**${beat.text?.includes(beat.keyword) ? '' : ' (자막에 해당 단어 없음 — 확인 필요)'}`);
      if (beat.visualCue) out.push(`   - 연출 의도: ${md(beat.visualCue)}`);
    }
    out.push('');
  }
  if (c.suggestedCaption) out.push('## 게시 문구', '', md(c.suggestedCaption), '', md((c.hashtags ?? []).join(' ')), '');
  return `${out.join('\n')}\n`;
}

export async function describeDirectory(directory) {
  const names = (await fs.readdir(directory)).filter(n => /^candidate-\d+\.json$/.test(n)).sort();
  if (!names.length) throw new Error(`No candidate JSON files in ${directory}`);
  const candidates = await Promise.all(names.map(async filename => {
    const manifest = JSON.parse(await fs.readFile(path.join(directory, filename), 'utf8'));
    return {filename, manifest, markdown: describeCandidate(manifest, filename)};
  }));
  const index = ['# 숏츠 후보 스토리보드', '',
    '각 후보의 스토리보드를 열어 대본, 화면 구성, 도식의 변화, 자막 리듬을 검토하세요. 원본 JSON을 수정한 경우 이 문서도 다시 생성해야 합니다.', ''];
  for (const {filename, manifest, markdown} of candidates) {
    const outputName = filename.replace(/\.json$/, '.md');
    await fs.writeFile(path.join(directory, outputName), markdown);
    index.push(`## ${md(manifest.id || filename)} · ${md(manifest.candidate?.title)}`, '',
      `**첫 문장:** ${md(manifest.candidate?.hook)}`, '',
      `${md(manifest.candidate?.rationale)}`, '',
      `[스토리보드 읽기](${outputName}) · [원본 JSON](${filename}) · ${manifest.scenes.length}장면`, '');
  }
  // Remove only generated companions of deleted candidates, not other authored documents.
  for (const name of await fs.readdir(directory)) {
    if (/^candidate-\d+\.md$/.test(name) && !names.includes(name.replace(/\.md$/, '.json'))) {
      const existing = await fs.readFile(path.join(directory, name), 'utf8');
      if (existing.includes('JSON에서 자동 생성한 검토용 스토리보드입니다.')) await fs.unlink(path.join(directory, name));
    }
  }
  await fs.writeFile(path.join(directory, 'README.md'), `${index.join('\n')}\n`);
  return candidates.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Usage: node shorts/scripts/describe-candidates.mjs <candidate-directory>');
  const count = await describeDirectory(directory);
  console.log(`Wrote ${count} readable storyboards in ${directory}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const relative = path.relative(process.cwd(), path.resolve(directory)).split(path.sep).map(encodeURIComponent).join('/');
    const base = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/blob/automation/shorts-${process.env.GITHUB_RUN_ID}`;
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## 후보 스토리보드\n\n${count}개 후보의 대본·화면 구성·도식·자막 리듬을 문서로 생성했습니다. 리뷰 PR이 생성된 뒤 [후보 목록](${base}/${relative}/README.md)을 열어 확인하세요.\n`);
  }
}
