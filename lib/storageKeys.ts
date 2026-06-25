export const GUEST = "guest";

/** Namespaced localStorage key for a given account email + data bucket. */
export function bucketKey(email: string, name: string) {
  return `dc:${email}:${name}`;
}

/** Copy every `dc:from:*` key to `dc:to:*`, then optionally clear the source. */
export function migrateBucket(from: string, to: string, clearSource = true) {
  const fromPrefix = `dc:${from}:`;
  const toPrefix = `dc:${to}:`;
  const moves: [string, string][] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(fromPrefix)) {
      moves.push([key, toPrefix + key.slice(fromPrefix.length)]);
    }
  }
  for (const [src, dst] of moves) {
    const val = localStorage.getItem(src);
    if (val != null) localStorage.setItem(dst, val);
    if (clearSource) localStorage.removeItem(src);
  }
}
