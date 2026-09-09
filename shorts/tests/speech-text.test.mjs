import test from 'node:test';
import assert from 'node:assert/strict';
import {speechReading, UnsupportedSpeechTextError} from '../src/presenter/speech-text.ts';

test('technical tokens retain Korean particles and use whole-run readings', () => {
  for (const [word, expected] of Object.entries({
    'SDK가':'에스디케이가', 'API를':'에이피아이를', 'Bruno에서':'브루노에서',
    'Git으로':'깃으로', 'traceparent로':'트레이스페어런트로', 'PR에':'피알에',
    'SDK/API':'에스디케이에이피아이', 'GitHub':'깃허브', 'ＳＤＫ가':'에스디케이가',
    '1.5배':'일점오배', '2026년':'이영이육년', 'v2':'브이이',
  })) assert.equal(speechReading(word).text, expected, word);
});
test('Hangul stays unchanged; approximations are explicit and deterministic', () => {
  assert.deepEqual(speechReading('한글입니다.'), {text:'한글입니다',substitutions:[]});
  assert.equal(speechReading('각'.normalize('NFD')).text, '각');
  assert.equal(speechReading('...').text, '');
  const result = speechReading('Foo42');
  assert.equal(result.text, '에프오오사이');
  assert.deepEqual(result.substitutions.map(s => s.method), ['letter-names','digit-names']);
  assert.deepEqual(speechReading('Foo42'), result);
  assert.equal(typeof speechReading('constructor').text, 'string');
  assert.throws(() => speechReading('漢字'), UnsupportedSpeechTextError);
});
