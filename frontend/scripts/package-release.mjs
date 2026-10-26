// After `gradlew assembleRelease`: names the APK for each place it goes, proves it will install over the
// apps already in the field, and writes the two files for the OLD server.   node scripts/package-release.mjs
//
//   release/RKS_ONE.apk                      the GitHub Release asset (RKS_ONE_<version>.apk is the same file)
//   release/old-server/Shop_RKS_v1.0.41.apk  the same file, under the name the OLD server's code hands out
//   release/old-server/version.json          what installed apps check on the OLD server
//   release/old-server/README.txt            where to put them
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const published = JSON.parse(readFileSync(join(root, 'public/version.json'), 'utf8'));
const apk = join(root, 'android/app/build/outputs/apk/release/app-release.apk');
if (!existsSync(apk)) { console.error('No release APK yet. Run: cd android && gradlew assembleRelease'); process.exit(1); }
if (pkg.version !== published.version) { console.error(`package.json says ${pkg.version} but public/version.json says ${published.version}. Run npm run version:set.`); process.exit(1); }

// Signature check. The production APK that staff installed is the reference.
const sdk = join(process.env.LOCALAPPDATA ?? '', 'Android/Sdk/build-tools');
const tool = readdirSync(sdk).sort().reverse().map(v => join(sdk, v, 'apksigner.bat')).find(existsSync);
const jbr = 'C:/Program Files/Android/Android Studio/jbr';
const sha = file => {
  const r = spawnSync(tool, ['verify', '--print-certs', file], { encoding: 'utf8', shell: true, env: { ...process.env, JAVA_HOME: jbr } });
  return { ok: r.status === 0, sha: /SHA-256 digest: ([0-9a-f]+)/i.exec(r.stdout)?.[1]?.toLowerCase() };
};
const mine = sha(apk);
const reference = 'D:/shop-rks/frontend/public/Shop_RKS_v1.0.41.apk';
const field = existsSync(reference) ? sha(reference) : null;
if (!mine.ok) { console.error('The new APK does not verify as signed.'); process.exit(1); }
if (field && field.sha !== mine.sha) {
  console.error(`SIGNATURE MISMATCH: the new APK is signed with ${mine.sha}, the installed app with ${field.sha}. Android would refuse the update.`);
  process.exit(1);
}
console.log(`Signed, and the key matches the installed app (${mine.sha.slice(0, 16)}…).`);

const out = join(root, 'release');
const old = join(out, 'old-server');
mkdirSync(old, { recursive: true });
copyFileSync(apk, join(out, 'RKS_ONE.apk'));
copyFileSync(apk, join(out, `RKS_ONE_${pkg.version}.apk`));
copyFileSync(apk, join(old, 'Shop_RKS_v1.0.41.apk'));
// The old server returns "/Shop_RKS_v1.0.41.apk" from its own code whatever version.json says, so the file keeps that name.
writeFileSync(join(old, 'version.json'), JSON.stringify({
  apkUrl: '/Shop_RKS_v1.0.41.apk',
  releaseNotes: published.releaseNotes,
  version: pkg.version,
}, null, 4) + '\n');
writeFileSync(join(old, 'README.txt'), `Putting RKS ONE ${pkg.version} on the OLD server (shop-rks.onrender.com)
=====================================================================
Installed apps (1.0.41) ask the old server for /version.json. When it names a newer version they show the
update popup, check the username and password against the old API, and then download /Shop_RKS_v1.0.41.apk
from the old server (that file name is fixed in the old server's code).

In D:\\shop-rks\\frontend\\public\\ :
  1. Replace  Shop_RKS_v1.0.41.apk  with the file of the same name from this folder.
  2. Replace  version.json          with the one from this folder (version ${pkg.version}).
  3. Commit and push to main, as for any change. Render redeploys the old service.
No old source code changes. Do not rename the APK.

After the update the app is RKS ONE ${pkg.version}: it uses the new site and new API, and from then on it
checks https://rksone.qenbel.site/version.json for updates, so the old server is not needed again.
Staff sign in again once (the old sign-in tokens are not valid on the new server).
`);
console.log(`\nrelease/RKS_ONE_${pkg.version}.apk, release/RKS_ONE.apk, release/old-server/{Shop_RKS_v1.0.41.apk, version.json, README.txt}`);
