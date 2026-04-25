import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '..', 'assets');
const svgPath = resolve(assets, 'logo.svg');
const svg = readFileSync(svgPath);

const SAFFRON = { r: 234, g: 88, b: 12, alpha: 1 };

async function squareIcon(size, outName) {
  const out = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: SAFFRON })
    .png()
    .toBuffer();
  writeFileSync(resolve(assets, outName), out);
  console.log(`✓ ${outName} (${size}x${size})`);
}

async function splash(width, height, outName) {
  const inset = Math.round(Math.min(width, height) * 0.55);
  const logo = await sharp(svg, { density: 384 })
    .resize(inset, inset, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const out = await sharp({
    create: { width, height, channels: 4, background: SAFFRON },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
  writeFileSync(resolve(assets, outName), out);
  console.log(`✓ ${outName} (${width}x${height})`);
}

await squareIcon(1024, 'icon.png');
await squareIcon(1024, 'adaptive-icon.png');
await squareIcon(48, 'favicon.png');
await splash(1284, 2778, 'splash.png');
console.log('All icons generated.');
