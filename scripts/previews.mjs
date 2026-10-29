// Screenshots of the projects' live sites, for the workshop (src/data/projects.ts):
// 1280 × 800, saved as public/projects/<id>.jpg. Run with `npm run previews`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SITES = {
  'brazilian-hair-studio': 'https://brazilian-hair-studio.com/',
  'cabelos-e-formas': 'https://cbf.jeffersonrdebem.workers.dev/',
  'debem-consultoria': 'https://debemconsultoria.com/',
  // A big city, made up for the picture (?demo saves nothing).
  'ode-city': 'https://eduardodgdebem.github.io/ode-city/?demo=1500',
};

const dir = mkdtempSync(join(tmpdir(), 'previews-'));
for (const [id, url] of Object.entries(SITES)) {
  const png = join(dir, `${id}.png`);
  // Time for the page's fonts and its entrance animations before the shot.
  execFileSync(CHROME, ['--headless', '--hide-scrollbars', '--use-angle=metal', '--enable-gpu', '--window-size=1280,800', '--virtual-time-budget=6000', `--screenshot=${png}`, url], { stdio: 'ignore' });
  await sharp(png).jpeg({ quality: 72 }).toFile(`public/projects/${id}.jpg`);
  console.log(id);
}
rmSync(dir, { recursive: true });
