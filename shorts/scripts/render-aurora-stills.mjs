import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const outputDir = path.resolve(process.argv[2] || 'shorts/.tmp/aurora-explain-stills');
const htmlPath = path.resolve('shorts/hyperframes/aurora-explain/reference-stills.html');

const captures = [
  ['browser-terminal', 'aurora-browser-terminal.png'],
  ['glass-pipeline', 'aurora-glass-pipeline.png'],
  ['cta', 'aurora-cta.png'],
];

await fs.mkdir(outputDir, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  await page.goto(pathToFileURL(htmlPath).href, {waitUntil: 'load'});
  await page.evaluate(async () => document.fonts?.ready);

  for (const [id, filename] of captures) {
    const frame = page.locator(`[data-still="${id}"]`);
    if (await frame.count() !== 1) throw new Error(`Expected one still frame for ${id}`);
    await frame.screenshot({path: path.join(outputDir, filename)});
  }
} finally {
  await browser.close();
}

console.log(`Rendered Aurora stills to ${outputDir}`);
