// Rasterizes assets/logo.svg → assets/logo.png (+ dark variant) at 1024px.
// These feed `npx @capacitor/assets generate`, which expands them into every
// iOS/Android icon + splash size.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const svg = readFileSync(join(dir, 'logo.svg'));

for (const name of ['logo.png', 'logo-dark.png']) {
  await sharp(svg, { density: 384 })
    .resize(1024, 1024)
    .png()
    .toFile(join(dir, name));
  console.log('wrote assets/' + name);
}
