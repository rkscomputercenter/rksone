// Sets the app version everywhere in one go:  node scripts/set-version.mjs 1.0.43
//   package.json (+ lock)        the version the app reports about itself
//   public/version.json          what installed apps compare against (served at <web app>/version.json)
//   android/app/build.gradle     versionName, and versionCode = major*10000 + minor*100 + patch
// Refuses a version whose versionCode is not higher than the current one: Android will not install
// an APK over an installed app unless its versionCode is higher.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next ?? '')) {
  console.error('Usage: node scripts/set-version.mjs <major.minor.patch>   e.g. 1.0.43');
  process.exit(1);
}
const [major, minor, patch] = next.split('.').map(Number);
const code = major * 10000 + minor * 100 + patch;

const gradlePath = join(root, 'android/app/build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
const current = Number(/versionCode\s+(\d+)/.exec(gradle)?.[1]);
if (!Number.isFinite(current)) { console.error('Could not find versionCode in build.gradle'); process.exit(1); }
if (code <= current && process.argv[3] !== '--same') {
  console.error(`versionCode ${code} (for ${next}) is not higher than the current ${current}. Pick a newer version.`);
  process.exit(1);
}
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${next}"`);
writeFileSync(gradlePath, gradle);

for (const file of ['package.json', 'package-lock.json']) {
  const path = join(root, file);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  json.version = next;
  if (json.packages?.['']) json.packages[''].version = next;
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
}

const versionPath = join(root, 'public/version.json');
const published = JSON.parse(readFileSync(versionPath, 'utf8'));
published.version = next;
writeFileSync(versionPath, JSON.stringify(published, null, 2) + '\n');

console.log(`Version ${next}: versionName "${next}", versionCode ${code} (was ${current}).`);
console.log('Next: write the release notes in public/version.json, then build the APK (see DEPLOYMENT.md, "Android app").');
