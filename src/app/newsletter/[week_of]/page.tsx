import { getNewsletterByWeek } from "@/lib/newsletter-data";
import { NewsletterEdition } from "@/components/newsletter-edition";
import { ShareStrip } from "@/components/share-strip";
import {
  buildNewsletterCaption,
  newsletterOgPath,
  newsletterShareUrl,
} from "@/lib/share";
import { getSiteBaseUrl } from "@/lib/json-ld";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ week_of: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { week_of } = await params;
  const newsletter = await getNewsletterByWeek(week_of);
  if (!newsletter) return { title: "Not Found" };

  const title = `${newsletter.headline} | BPI Weekly`;
  const description = `Burger Price Index weekly market report for ${week_of}. Bloomberg Terminal energy, Wendy's drive-thru prices.`;
  const ogImage = newsletterOgPath(week_of);
  const canonical = `${getSiteBaseUrl()}/newsletter/${week_of}`;

  return {
    title,
    description,
    alternates: { canonical },
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

  return (
    <div className="min-h-screen bg-[#080810] py-10 px-6">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center gap-2">
        <Link
          href="/"
          className="text-xs text-green-500/50 hover:text-green-400 font-mono transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-green-500/30 text-xs">/</span>
        <Link
          href="/newsletter"
          className="text-xs text-green-500/50 hover:text-green-400 font-mono transition-colors"
        >
          Newsletter
        </Link>
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
    </div>
  );
}