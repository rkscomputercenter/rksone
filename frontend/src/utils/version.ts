/** Dotted versions like "1.0.42". Missing or non-numeric parts count as 0. */
const parts = (v: string): number[] => v.split('.').map(p => parseInt(p, 10) || 0);

/** 1 if a is newer than b, -1 if older, 0 if equal ("1.0.9" < "1.0.10", "1.1" == "1.1.0"). */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i] ?? 0;
    const q = y[i] ?? 0;
    if (p > q) return 1;
    if (p < q) return -1;
  }
  return 0;
}

/**
 * Android versionCode for a version name: major*10000 + minor*100 + patch.
 * 1.0.42 -> 10042, 1.0.43 -> 10043, 1.1.0 -> 10100, 2.0.0 -> 20000.
 * Android only installs an APK over an installed one when this number is higher. The apps in the
 * field (1.0.41) have versionCode 41, so 10042 is higher, and so is every later version.
 */
export function versionCodeOf(v: string): number {
  const [major = 0, minor = 0, patch = 0] = parts(v);
  return major * 10000 + minor * 100 + patch;
}
