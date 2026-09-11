/**
 * Share URL + paste-ready caption helpers (deadpan financial tone).
 */

const DEFAULT_BASE = "https://burgerprice.com";

export function getShareBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

function formatWeekShort(weekOf: string): string {
  const d = new Date(`${weekOf}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return weekOf;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function showdownShareUrl(leftSlug: string, rightSlug: string): string {
  return `${getShareBaseUrl()}/?showdown=${encodeURIComponent(`${leftSlug},${rightSlug}`)}`;
}

export function showdownOgPath(leftSlug?: string, rightSlug?: string): string {
  if (leftSlug && rightSlug) {
    return `/api/og?showdown=${encodeURIComponent(`${leftSlug},${rightSlug}`)}`;
  }
  return "/api/og?showdown=1";
}

export function cityShareUrl(slug: string): string {
  return `${getShareBaseUrl()}/cities/${slug}`;
}

export function buildShowdownCaption(opts: {
  leftName: string;
  leftBpi: number;
  rightName: string;
  rightBpi: number;
  weekOf: string;
  leftSlug: string;
  rightSlug: string;
}): string {
  const week = formatWeekShort(opts.weekOf);
  const gap = Math.abs(opts.leftBpi - opts.rightBpi);
  const leader =
    opts.leftBpi === opts.rightBpi
      ? null
      : opts.leftBpi > opts.rightBpi
        ? opts.leftName
        : opts.rightName;
  const spread =
    leader == null
      ? "Locked at parity."
      : `${leader} leads by $${gap.toFixed(2)}.`;
  return `${opts.leftName} ($${opts.leftBpi.toFixed(2)}) vs ${opts.rightName} ($${opts.rightBpi.toFixed(2)}) — week of ${week}. ${spread} Track it: ${showdownShareUrl(opts.leftSlug, opts.rightSlug)}`;
}

export function buildCityCaption(opts: {
  name: string;
  state: string;
  slug: string;
  bpi: number | null;
  changePct: number | null;
}): string {
  const bpiText =
    opts.bpi == null ? "collecting data" : `$${opts.bpi.toFixed(2)}`;
  const changeText =
    opts.changePct == null || Number.isNaN(opts.changePct)
      ? ""
      : ` (${opts.changePct > 0 ? "+" : ""}${opts.changePct.toFixed(1)}% WoW)`;
  return `${opts.name}, ${opts.state} BPI: ${bpiText}${changeText}. Bloomberg Terminal energy, Wendy's drive-thru prices — ${cityShareUrl(opts.slug)}`;
}
