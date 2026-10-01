import {
  getLatestNewsletter,
  getNewsletterByWeek,
} from "@/lib/newsletter-data";
import { NewsletterEdition } from "@/components/newsletter-edition";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ShareStrip } from "@/components/share-strip";
import {
  buildNewsletterCaption,
  newsletterOgPath,
  newsletterShareUrl,
} from "@/lib/share";
import {
  NEWSLETTER_FAQ_ITEMS,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
  getSiteBaseUrl,
} from "@/lib/json-ld";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ week_of: string }>;
}

function weekOfLabel(weekOf: string): string {
  const formatted = new Date(weekOf + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Week of ${formatted}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { week_of } = await params;
  const newsletter = await getNewsletterByWeek(week_of);
  if (!newsletter) return { title: "Not Found" };

  const title = `${newsletter.headline} | BPI Weekly`;
  const description = `Burger Price Index weekly market report for ${week_of}. Bloomberg Terminal energy, Wendy's drive-thru prices.`;
  const ogImage = newsletterOgPath(week_of);
  const canonical = `${getSiteBaseUrl()}/newsletter/${week_of}`;

  // Only the latest edition is indexable. Archived issues are thin and eat
  // crawl budget, so they render normally for readers but are noindex,follow.
  // If the latest edition can't be determined, default to noindex.
  const latest = await getLatestNewsletter();
  const latestWeek = latest ? String(latest.week_of).slice(0, 10) : null;
  const isLatest = latestWeek !== null && latestWeek === week_of;

  return {
    title,
    description,
    alternates: { canonical },
    ...(isLatest ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: newsletter.headline,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function NewsletterEditionPage({ params }: PageProps) {
  const { week_of } = await params;
  const newsletter = await getNewsletterByWeek(week_of);

  if (!newsletter) {
    notFound();
  }

  const shareUrl = newsletterShareUrl(newsletter.week_of);
  const caption = buildNewsletterCaption({
    weekOf: newsletter.week_of,
    headline: newsletter.headline,
  });

  const weekKey = String(newsletter.week_of).slice(0, 10);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Newsletter", path: "/newsletter" },
    {
      name: weekOfLabel(weekKey),
      path: `/newsletter/${week_of}`,
    },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(crumbs);
  const webpageJsonLd = buildWebPageJsonLd({
    name: `${newsletter.headline} | BPI Weekly`,
    description: `Burger Price Index weekly market report for ${weekKey}. Bloomberg Terminal energy, Wendy's drive-thru prices.`,
    path: `/newsletter/${week_of}`,
    dateModified: weekKey,
  });
  const faqJsonLd = buildFaqPageJsonLd(NEWSLETTER_FAQ_ITEMS);

  return (
    <div className="min-h-screen bg-[#080810] py-10 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="max-w-4xl mx-auto mb-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>

      <NewsletterEdition
        weekOf={newsletter.week_of}
        headline={newsletter.headline}
        sections={newsletter.sections}
      />

      <div className="max-w-4xl mx-auto">
        <ShareStrip
          shareUrl={shareUrl}
          caption={caption}
          label="SHARE THE PRINT"
        />
      </div>

      <section
        className="max-w-4xl mx-auto mt-12"
        aria-labelledby="newsletter-faq"
      >
        <h2
          id="newsletter-faq"
          className="text-[11px] text-green-500/60 font-mono font-bold uppercase tracking-[0.2em] mb-4"
        >
          Newsletter FAQ
        </h2>
        <div className="space-y-3">
          {NEWSLETTER_FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group bg-[#0d0d1a] border border-[#1a3a1a] rounded-2xl px-5 py-4"
            >
              <summary className="cursor-pointer list-none font-medium text-sm text-gray-200 flex items-center justify-between gap-4">
                {item.q}
                <span className="text-green-500/30 group-open:rotate-45 transition-transform text-lg leading-none">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
