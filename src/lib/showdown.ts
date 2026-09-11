/**
 * Deterministic weekly showdown pair selection.
 * Uses a simple hash of the week_of date string to pick 2 cities.
 * Same week always produces the same pair.
 */
export function getShowdownIndices(weekOf: string, cityCount: number): [number, number] {
  if (cityCount < 2) return [0, 0];

  // Simple string hash
  let hash = 0;
  for (let i = 0; i < weekOf.length; i++) {
    hash = (hash * 31 + weekOf.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  const idx1 = hash % cityCount;
  let idx2 = (hash * 7 + 13) % cityCount;
  if (idx2 === idx1) {
    idx2 = (idx1 + 1) % cityCount;
  }

  return [idx1, idx2];
}

/**
 * Parse showdown query params into an optional city-slug pair.
 * Accepts:
 *   ?showdown=1 | true          → weekly pair (returns null)
 *   ?showdown=slug-a,slug-b     → explicit pair
 *   ?left=slug-a&right=slug-b   → explicit pair
 */
export function parseShowdownPair(
  showdown: string | null,
  left: string | null,
  right: string | null,
): [string, string] | null {
  if (left && right) {
    return [left.trim().toLowerCase(), right.trim().toLowerCase()];
  }
  if (!showdown) return null;
  const trimmed = showdown.trim();
  if (!trimmed || trimmed === "1" || trimmed.toLowerCase() === "true") {
    return null;
  }
  const parts = trimmed
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return null;
}

export function isShowdownRequest(opts: {
  showdown: string | null;
  type: string | null;
  left: string | null;
  right: string | null;
}): boolean {
  if (opts.type === "showdown") return true;
  if (opts.left && opts.right) return true;
  if (opts.showdown == null || opts.showdown === "") return false;
  return true;
}
