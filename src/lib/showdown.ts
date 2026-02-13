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
