import type { NewsletterEdition, NewsletterTapeMover } from "../types";
import type { TapeSameStoreRead } from "../same-store";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const C = {
  ink: "#0b0f14",
  paper: "#ffffff",
  wash: "#f6f4ef",
  text: "#1f2328",
  muted: "#6b7280",
  ketchup: "#c8102e",
  mustard: "#f5b700",
  up: "#0f8a3c",
  down: "#c8102e",
  rule: "#e5e1d8",
};
const MONO = "'JetBrains Mono',Menlo,Consolas,monospace";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paras(s: string): string {
  return String(s ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font:16px/1.6 ${SANS};color:${C.text}">${esc(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

function money(n: unknown): string {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "—";
}

function signed(pct: number): string {
  if (!Number.isFinite(pct) || pct === 0) return "flat";
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function weekLabel(weekOf: string): string {
  const d = new Date(`${weekOf.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function tapeKey(name: string): string {
  return name.split(",")[0].toLowerCase().replace(/[^a-z]+/g, "");
}

function sectionTitle(t: string): string {
  return `<p style="margin:28px 0 10px;font:700 11px/1 ${MONO};letter-spacing:2px;text-transform:uppercase;color:${C.ketchup}">${esc(t)}</p>`;
}

function shell(opts: {
  preheader: string;
  body: string;
  footer: string;
}): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>Burger Price Index</title></head>
<body style="margin:0;padding:0;background:${C.wash}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.wash}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.paper};border:1px solid ${C.rule}">
<tr><td style="background:${C.ink};padding:18px 24px">
  <span style="font:700 18px/1 ${MONO};color:${C.mustard};letter-spacing:1px">BPI</span>
  <span style="font:600 13px/1 ${SANS};color:#ffffff;padding-left:8px">Burger Price Index</span>
</td></tr>
<tr><td style="padding:24px 24px 8px">${opts.body}</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid ${C.rule};font:12px/1.6 ${SANS};color:${C.muted}">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td style="background:${C.ketchup};border-radius:6px">
<a href="${esc(href)}" style="display:inline-block;padding:12px 20px;font:700 15px/1 ${SANS};color:#ffffff;text-decoration:none">${esc(label)}</a></td></tr></table>`;
}

function tapeRow(m: NewsletterTapeMover, read: TapeSameStoreRead | undefined): string {
  const pct = Number(m.changePct);
  const up = m.direction === "up" || pct > 0;
  const color = up ? C.up : C.down;
  const arrow = up ? "▲" : "▼";
  let ss = "";
  if (read) {
    const tag =
      read.read === "mix" ? "BASKET MIX" : read.read === "real" ? "REAL MOVE" : read.read === "new-basket" ? "NEW BASKET" : "";
    const body =
      read.sameStore == null
        ? `same-store: no carried-over spots`
        : `same-store ${signed(read.sameStore)} (${read.carried}/${read.total} spots priced both weeks)`;
    ss = `<div style="font:11px/1.5 ${MONO};color:${C.muted};margin-top:4px">${tag ? `<b>${tag}</b> · ` : ""}${esc(body)}</div>`;
  }
  return `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.rule}">
<div style="font:700 15px/1.3 ${SANS};color:${C.text}">${esc(m.city)} <span style="font:700 14px ${MONO};color:${color}">${arrow} ${esc(signed(Math.abs(pct) * (up ? 1 : -1)))}</span></div>
<div style="font:14px/1.5 ${SANS};color:${C.text};margin-top:2px">${esc(m.commentary)}</div>${ss}
</td></tr>`;
}

function footerHtml(unsubscribeUrl: string, postalAddress: string, why: string): string {
  return `${esc(why)}<br>
<a href="${esc(unsubscribeUrl)}" style="color:${C.muted}">Unsubscribe</a> in one click. No hard feelings, prices will still go up without you.<br>
Burger Price Index · burgerprice.com${postalAddress ? ` · ${esc(postalAddress)}` : ""}`;
}

/** The Monday issue, rendered for email. */
export function renderIssueEmail(opts: {
  edition: NewsletterEdition;
  baseUrl: string;
  unsubscribeUrl: string;
  postalAddress: string;
  sameStore?: Record<string, TapeSameStoreRead>;
}): RenderedEmail {
  const { edition, baseUrl, unsubscribeUrl, postalAddress, sameStore } = opts;
  const s = edition.sections ?? ({} as NewsletterEdition["sections"]);
  const week = edition.week_of.slice(0, 10);
  const webUrl = `${baseUrl}/newsletter/${week}`;
  const headline = edition.headline || s.headline || `The BPI print for ${weekLabel(week)}`;
  const subject = `BPI Weekly · ${headline}`.slice(0, 140);
  const tape = Array.isArray(s.theTape) ? s.theTape : [];

  const parts: string[] = [];
  parts.push(
    `<p style="margin:0 0 6px;font:700 11px/1 ${MONO};letter-spacing:2px;color:${C.muted}">WEEK OF ${esc(weekLabel(week).toUpperCase())}</p>`,
    `<h1 style="margin:0 0 16px;font:800 24px/1.25 ${SANS};color:${C.ink}">${esc(headline)}</h1>`,
  );
  if (s.marketOverview) parts.push(sectionTitle("Market Overview"), paras(s.marketOverview));
  if (tape.length) {
    parts.push(
      sectionTitle("The Tape"),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tape
        .map((m) => tapeRow(m, sameStore?.[tapeKey(m.city)]))
        .join("")}</table>`,
    );
    if (sameStore && Object.keys(sameStore).length) {
      parts.push(
        `<p style="margin:8px 0 0;font:12px/1.5 ${SANS};color:${C.muted}">Same-store = the average move at spots we priced both weeks. <a href="${esc(baseUrl)}/about#same-store" style="color:${C.muted}">How we read it</a>.</p>`,
      );
    }
  }
  if (s.citySpotlight?.narrative) {
    parts.push(sectionTitle(`City Spotlight · ${s.citySpotlight.city ?? ""}`), paras(s.citySpotlight.narrative));
  }
  const botw = s.burgerOfTheWeek;
  if (botw?.burger) {
    parts.push(
      sectionTitle("Burger of the Week"),
      `<p style="margin:0 0 8px;font:700 17px/1.4 ${SANS};color:${C.ink}">${esc(botw.burger)} <span style="font:700 15px ${MONO};color:${C.ketchup}">${money(botw.price)}</span></p>`,
      `<p style="margin:0 0 10px;font:13px/1.4 ${SANS};color:${C.muted}">${esc(botw.restaurant)} · ${esc(botw.city)}</p>`,
      paras(botw.review ?? ""),
    );
  }
  const spread = s.theSpread;
  if (spread?.cheapest && spread?.mostExpensive) {
    parts.push(
      sectionTitle("The Spread"),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px"><tr>
<td width="50%" style="padding:12px;background:${C.wash};vertical-align:top"><div style="font:700 11px ${MONO};color:${C.up}">CHEAPEST</div><div style="font:700 20px ${MONO};color:${C.ink};margin:4px 0">${money(spread.cheapest.price)}</div><div style="font:13px/1.4 ${SANS};color:${C.text}">${esc(spread.cheapest.restaurant)}<br>${esc(spread.cheapest.city)}</div></td>
<td width="8"></td>
<td width="50%" style="padding:12px;background:${C.wash};vertical-align:top"><div style="font:700 11px ${MONO};color:${C.down}">PRICIEST</div><div style="font:700 20px ${MONO};color:${C.ink};margin:4px 0">${money(spread.mostExpensive.price)}</div><div style="font:13px/1.4 ${SANS};color:${C.text}">${esc(spread.mostExpensive.restaurant)}<br>${esc(spread.mostExpensive.city)}</div></td>
</tr></table>`,
      paras(spread.commentary ?? ""),
    );
  }
  if (s.analystsCorner?.essay) {
    parts.push(sectionTitle(`Analyst's Corner${s.analystsCorner.title ? ` · ${s.analystsCorner.title}` : ""}`), paras(s.analystsCorner.essay));
  }
  parts.push(
    `<div style="height:8px"></div>`,
    button(webUrl, "Read it on the terminal →"),
    `<p style="margin:0;font:13px/1.5 ${SANS};color:${C.muted}">Charts, city boards, and the full tape live at <a href="${esc(baseUrl)}" style="color:${C.muted}">burgerprice.com</a>.</p>`,
  );

  const text = [
    `BPI WEEKLY · WEEK OF ${weekLabel(week).toUpperCase()}`,
    headline,
    "",
    s.marketOverview ?? "",
    "",
    tape.length ? "THE TAPE" : "",
    ...tape.map((m) => {
      const r = sameStore?.[tapeKey(m.city)];
      const ss = r && r.sameStore != null ? ` (same-store ${signed(r.sameStore)})` : "";
      return `- ${m.city} ${m.direction === "down" ? "▼" : "▲"} ${Math.abs(Number(m.changePct)).toFixed(1)}%${ss}: ${m.commentary}`;
    }),
    "",
    botw?.burger ? `BURGER OF THE WEEK: ${botw.burger}, ${botw.restaurant} (${botw.city}) ${money(botw.price)}` : "",
    "",
    `Read the full issue: ${webUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
    `Burger Price Index · burgerprice.com${postalAddress ? ` · ${postalAddress}` : ""}`,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  const html = shell({
    preheader: (s.marketOverview ?? headline).slice(0, 140),
    body: parts.join(""),
    footer: footerHtml(
      unsubscribeUrl,
      postalAddress,
      "You're getting this because you subscribed to the weekly BPI print at burgerprice.com.",
    ),
  });
  return { subject, html, text };
}

/** Double opt-in confirmation. */
export function renderConfirmEmail(opts: {
  confirmUrl: string;
  unsubscribeUrl: string;
  postalAddress: string;
}): RenderedEmail {
  const subject = "Confirm your seat on the BPI tape";
  const body = [
    `<h1 style="margin:0 0 14px;font:800 22px/1.3 ${SANS};color:${C.ink}">One click and you're in.</h1>`,
    paras(
      "Somebody (hopefully you) asked for the weekly Burger Price Index: what a burger costs across US cities, the week's biggest movers, and the Burger of the Week, every Monday.",
    ),
    button(opts.confirmUrl, "Confirm my subscription"),
    paras("Didn't ask for this? Ignore it and you won't hear from us again."),
  ].join("");
  const text = [
    "One click and you're in.",
    "",
    "Confirm your subscription to the weekly Burger Price Index:",
    opts.confirmUrl,
    "",
    "Didn't ask for this? Ignore it and you won't hear from us again.",
  ].join("\n");
  const html = shell({
    preheader: "Confirm your subscription to the weekly Burger Price Index.",
    body,
    footer: footerHtml(
      opts.unsubscribeUrl,
      opts.postalAddress,
      "You're getting this one-time email because this address was entered at burgerprice.com.",
    ),
  });
  return { subject, html, text };
}
