import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {reelsReleaseCopy} from '../scripts/reels-release-copy.mjs';

test('release body pairs each video with its own caption and preserves copyable text', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'reels-copy-'));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  const caption = '첫 문장\n\n```literal```\n#개발 #커리어\n\n원문: https://dohyeon.kr/post/\n';
  for (const [name, text] of Object.entries({
    'a.mp4': '', 'a-REELS.txt': caption, 'b.mp4': '', 'b-REELS.txt': '두 번째 영상 문구',
    'old-REELS.txt': '이전 영상 문구는 제외', 'missing.mp4': '', 'empty.mp4': '', 'empty-REELS.txt': '\n',
  })) await fs.writeFile(path.join(dir, name), text);
  const body = await reelsReleaseCopy(dir);
  assert.ok(body.includes(`### a.mp4\n\n\`\`\`\`\n${caption}\`\`\`\``));
  assert.match(body, /### b.mp4\n\n```\n두 번째 영상 문구\n```/);
  assert.ok(!body.includes('이전 영상 문구는 제외'));
  assert.equal(body.match(/저장된 릴스 게시 문구가 없습니다/g).length, 2);
});
