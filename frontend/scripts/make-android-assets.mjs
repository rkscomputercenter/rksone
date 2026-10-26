// Draws the Android launcher icon and splash screen from the RKS ONE logo component, then lets
// @capacitor/assets cut them into every size:   node scripts/make-android-assets.mjs
// Source of truth for the artwork is src/components/brand/Logo.tsx (the same paths the website uses).
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const esbuild = require('esbuild');
const sharp = require('sharp');

// 1. Render the logo components to SVG text (bundle Logo.tsx with React's server renderer)
const tmp = join(root, 'node_modules/.cache/android-assets');
mkdirSync(tmp, { recursive: true });
const entry = join(tmp, 'entry.tsx');
writeFileSync(entry, `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RksOneLogo, RksOneMark } from ${JSON.stringify(join(root, 'src/components/brand/Logo.tsx').replace(/\\/g, '/'))};
console.log(JSON.stringify({
  logo: renderToStaticMarkup(<div style={{ color: '#fff' }}><RksOneLogo height={300} glow /></div>),
  mark: renderToStaticMarkup(<RksOneMark size={1024} />),
}));
`);
const bundle = join(tmp, 'entry.cjs');
esbuild.buildSync({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, absWorkingDir: root, logLevel: 'error' });
const { stdout } = spawnSync(process.execPath, [bundle], { encoding: 'utf8' });
const { logo, mark } = JSON.parse(stdout);
const svgOf = (markup) => /<svg[\s\S]*<\/svg>/.exec(markup)[0];   // the components already set xmlns
const logoSvg = svgOf(logo).replace(/currentColor/g, '#FFFFFF');   // RKS is drawn in the text colour: white on night
const markSvg = svgOf(mark);

// 2. Artwork pieces
const NIGHT = '#0B0A1F';
const squareMark = markSvg.replace(/rx="28"/, 'rx="0"');                       // full-bleed icon, the phone applies its own mask
const foreground = markSvg.replace(/<rect [^>]*>(<\/rect>)?/, '')                     // adaptive icon: the mark alone, kept inside the safe zone
  .replace(/(<svg[^>]*>)/, '$1<g transform="translate(64 64) scale(0.74) translate(-64 -64)">').replace('</svg>', '</g></svg>');
const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#151238"/><stop offset="1" stop-color="${NIGHT}"/></linearGradient></defs><rect width="128" height="128" fill="url(#g)"/></svg>`;

const out = join(root, 'assets');
rmSync(join(out, 'icon.png'), { force: true });   // the old brand's single-file sources
rmSync(join(out, 'splash.png'), { force: true });
mkdirSync(out, { recursive: true });
const png = (svg, size, file, bg) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size, { fit: 'contain', background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(join(out, file));

await png(squareMark, 1024, 'icon-only.png');
await png(foreground, 1024, 'icon-foreground.png');
await png(background, 1024, 'icon-background.png');

// Splash: the logo centred on the night background (one file serves light and dark phones)
const size = 2732;
const logoPng = await sharp(Buffer.from(logoSvg), { density: 300 }).resize({ width: 1500, withoutEnlargement: false }).png().toBuffer();
const splash = sharp({ create: { width: size, height: size, channels: 4, background: NIGHT } }).composite([{ input: logoPng, gravity: 'center' }]).png();
await splash.clone().toFile(join(out, 'splash.png'));
await splash.clone().toFile(join(out, 'splash-dark.png'));
console.log('Artwork written to assets/. Cutting sizes with @capacitor/assets…');

// 3. Cut every Android size
const res = spawnSync('npx', ['capacitor-assets', 'generate', '--android', '--iconBackgroundColor', NIGHT, '--splashBackgroundColor', NIGHT],
  { cwd: root, stdio: 'inherit', shell: true });
process.exit(res.status ?? 1);
