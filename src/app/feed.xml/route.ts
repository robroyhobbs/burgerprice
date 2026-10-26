import { getNewsletterFeedItems } from "@/lib/newsletter-data";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://burgerprice.com";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // strip control chars that are illegal in XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function rfc822(iso: string): string {
  const d = new Date(iso);
  return (Number.isNaN(d.getTime()) ? new Date() : d).toUTCString();
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function GET() {
  const items = await getNewsletterFeedItems(20);
  const feedUrl = `${baseUrl}/feed.xml`;
  const lastBuild = items[0] ? rfc822(items[0].created_at) : new Date().toUTCString();

  const itemXml = items
    .map((item) => {
      const link = `${baseUrl}/newsletter/${item.week_of}`;
      const desc = item.summary
        ? truncate(item.summary, 600)
        : `The Burger Price Index weekly print for the week of ${item.week_of}.`;
      return `    <item>
      <title>${xmlEscape(item.headline || `BPI Weekly — ${item.week_of}`)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${rfc822(`${item.week_of}T15:00:00.000Z`)}</pubDate>
      <description>${xmlEscape(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Burger Price Index — Weekly Newsletter</title>
    <link>${xmlEscape(`${baseUrl}/newsletter`)}</link>
    <description>The weekly print on what a burger costs across US cities: the national BPI, the movers, the spread, and the Burger of the Week.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <ttl>360</ttl>
    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />
${itemXml}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=3600",
    },
  });
}
