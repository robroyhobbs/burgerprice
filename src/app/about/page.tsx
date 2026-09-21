import Link from "next/link";
import type { Metadata } from "next";
import { ShareStrip } from "@/components/share-strip";
import { getSiteBaseUrl } from "@/lib/json-ld";
import {
  aboutOgPath,
  aboutShareUrl,
  buildAboutCaption,
} from "@/lib/share";

const TITLE = "About | Burger Price Index";
const DESCRIPTION =
  "How the Burger Price Index prices America's favorite economic barometer — weighted fast-food, casual, and gourmet burgers across 10 US cities. Bloomberg Terminal rigor. Wendy's frostiness. Not financial advice.";
const canonical = `${getSiteBaseUrl()}/about`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: canonical,
    images: [
      {
        url: aboutOgPath(),
        width: 1200,
        height: 630,
        alt: "Burger Price Index — how we print the BPI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [aboutOgPath()],
  },
};

const FAQ_ITEMS = [
  {
    q: "How often does the BPI update?",
    a: "Weekly. After each collection run clears, we reprint city scores, week-over-week changes, and the national average. The health endpoint’s latest_week is the Monday that labels the print.",
  },
  {
    q: "What goes into a city’s BPI score?",
    a: "A weighted average of burger prices from about 10–15 restaurants per city: Fast Food 20%, Casual/Diner 40%, Premium/Gourmet 40%. Same recipe every week so city ranks stay comparable.",
  },
  {
    q: "Why weight casual and premium more than fast food?",
    a: "National chains often set menu prices from HQ. Local diners and gourmet spots move with rent, labor, and beef — so we lean the index toward the local dining economy.",
  },
  {
    q: "Where do the prices come from?",
    a: "Restaurant menus, delivery platforms (DoorDash, Uber Eats), and restaurant websites. AI-assisted research compiles the week’s sample; humans review for accuracy before it hits the tape.",
  },
  {
    q: "What gets filtered out?",
    a: "Outliers below $1 or above $50. That keeps kids’-menu oddities and tasting-menu curiosities from warping the index.",
  },
  {
    q: "How is the national average calculated?",
    a: "Simple average of each city’s BPI for that week — equal weight per city with data, not population-weighted. City count can vary if a market is still collecting.",
  },
  {
    q: "What counts as a burger?",
    a: "A standard single burger entrée as listed on the menu (or the closest equivalent). Combos, sides, and tax/delivery fees stay out of the score so cities stay apples-to-apples.",
  },
  {
    q: "Is this financial advice?",
    a: "No. BPI is entertainment and information — not investment guidance. Past burger performance is not indicative of future burger results. Eat responsibly.",
  },
];

function buildAboutJsonLd(): Record<string, unknown>[] {
  const base = getSiteBaseUrl();
  const pageUrl = `${base}/about`;

  const webpage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "Burger Price Index",
      url: base,
    },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return [webpage, faqPage];
}

export default function AboutPage() {
  const jsonLd = buildAboutJsonLd();

  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
      {jsonLd.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-sm text-ketchup dark:text-mustard hover:underline mb-8 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        <h1 className="font-headline text-3xl md:text-4xl text-ketchup dark:text-mustard mb-6">
          About the Burger Price Index
        </h1>

        <div className="mb-8">
          <ShareStrip
            shareUrl={aboutShareUrl()}
            caption={buildAboutCaption({ cityCount: 10 })}
            label="Share the methodology"
          />
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-sm md:text-base leading-relaxed text-gray-700 dark:text-gray-300">
          <h2 className="font-headline text-xl text-gray-900 dark:text-white">What is the BPI?</h2>
          <p>
            The Burger Price Index (BPI) is a weekly index that tracks the average
            cost of a burger across US cities. Think of it as the Consumer Price
            Index, but exclusively for the most important food group: burgers.
          </p>
          <p>
            We currently track <strong>10 cities</strong>: Austin, Boston, Chicago,
            Los Angeles, Nashville, New Orleans, New York, Portland, San Francisco,
            and Seattle. Don&apos;t see yours? Request it on the{" "}
            <Link href="/cities" className="text-ketchup dark:text-mustard hover:underline">
              cities page
            </Link>
            — cities with 25+ requests get added to the index.
          </p>

          <h2 className="font-headline text-xl text-gray-900 dark:text-white">Methodology</h2>
          <p>
            Each week, we survey burger prices from 10-15 restaurants per city across
            three segments:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Fast Food (20% weight):</strong> Chain restaurants like
              McDonald&apos;s, Five Guys, Shake Shack, Wendy&apos;s
            </li>
            <li>
              <strong>Casual/Diner (40% weight):</strong> Local spots, diners, and
              casual burger joints
            </li>
            <li>
              <strong>Premium/Gourmet (40% weight):</strong> Upscale restaurants
              with gourmet burger offerings
            </li>
          </ul>
          <p>
            The BPI is a <em>weighted average</em> of these segments. We weight
            casual and premium more heavily because they reflect the local dining
            economy, while fast-food prices are largely set nationally.
          </p>

          <h2 className="font-headline text-xl text-gray-900 dark:text-white">Data Sources</h2>
          <p>
            Prices are collected from restaurant menus, delivery platforms
            (DoorDash, UberEats), and restaurant websites. We use AI-assisted
            research to compile and verify prices weekly, with human review for
            accuracy.
          </p>
          <p>
            Outlier filtering removes any prices below $1 or above $50 to prevent
            data quality issues.
          </p>

          <h2 className="font-headline text-xl text-gray-900 dark:text-white">Why Burgers?</h2>
          <p>
            The burger is America&apos;s economic barometer. Every city has them, every
            price point is represented, and they&apos;re sensitive to beef costs,
            labor markets, real estate, and consumer sentiment. Plus, tracking
            burger prices is objectively more fun than tracking treasury yields.
          </p>

          <h2 className="font-headline text-xl text-gray-900 dark:text-white">Disclaimer</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            The Burger Price Index is for entertainment and informational purposes
            only. It is not financial advice, investment guidance, or a substitute
            for actually going out and eating a burger. Past burger performance is
            not indicative of future burger results. Eat responsibly.
          </p>
        </div>

        {/* Methodology FAQ — visitor Qs that prose alone rarely answers */}
        <section className="mt-12" aria-labelledby="methodology-faq">
          <h2
            id="methodology-faq"
            className="font-headline text-2xl text-ketchup dark:text-mustard mb-6"
          >
            Methodology FAQ
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-medium text-sm text-gray-900 dark:text-white flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-gray-300 dark:text-gray-600 group-open:rotate-45 transition-transform text-lg leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-xs text-gray-400">
            Prefer the tape?{" "}
            <Link
              href="/rankings"
              className="text-ketchup dark:text-mustard hover:underline"
            >
              Weekly rankings
            </Link>
            {" · "}
            <Link
              href="/cities"
              className="text-ketchup dark:text-mustard hover:underline"
            >
              All cities
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
