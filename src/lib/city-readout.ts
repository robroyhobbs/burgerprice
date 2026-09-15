/**
 * One-line city "THE READ" — Bloomberg Terminal × Wendy's.
 */

export interface CityReadInput {
  name: string;
  bpi: number | null;
  changePct: number | null;
  rank: number;
  totalCities: number;
  nationalAvg: number | null;
  diffFromNational: number | null;
}

/**
 * Build a single deadpan sentence summarizing the city's BPI print.
 * Returns null when there's nothing useful to say (no BPI yet).
 */
export function buildCityRead(input: CityReadInput): string | null {
  const { name, bpi, changePct, rank, totalCities, nationalAvg, diffFromNational } =
    input;

  if (bpi == null) return null;

  const parts: string[] = [];

  parts.push(`${name} prints $${bpi.toFixed(2)}`);

  if (rank > 0 && totalCities > 0) {
    parts.push(`#${rank} of ${totalCities} on the tape`);
  }

  let sentence = parts.join(", ");

  if (diffFromNational != null && nationalAvg != null) {
    if (diffFromNational === 0) {
      sentence += ` — flat to the national $${nationalAvg.toFixed(2)}`;
    } else if (diffFromNational > 0) {
      sentence += ` — ${diffFromNational}% above the national $${nationalAvg.toFixed(2)}`;
    } else {
      sentence += ` — ${Math.abs(diffFromNational)}% below the national $${nationalAvg.toFixed(2)}`;
    }
  }

  if (changePct != null && changePct !== 0 && !Number.isNaN(changePct)) {
    const abs = Math.abs(changePct).toFixed(1);
    if (changePct > 0) {
      sentence += `, rallying ${abs}% on the week`;
    } else {
      sentence += `, easing ${abs}% on the week`;
    }
  } else if (changePct === 0) {
    sentence += `, unchanged on the week`;
  }

  sentence += ". The drive-thru doesn't care about your feelings.";

  return sentence;
}
