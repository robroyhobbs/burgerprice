import { getNewsletterByWeek } from "@/lib/newsletter-data";
import { NewsletterEdition } from "@/components/newsletter-edition";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ week_of: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { week_of } = await params;
  const newsletter = await getNewsletterByWeek(week_of);
  if (!newsletter) return { title: "Not Found" };

  return {
    title: `${newsletter.headline} | BPI Weekly`,
    description: `Burger Price Index weekly market report for ${week_of}.`,
  };
}

export default async function NewsletterEditionPage({ params }: PageProps) {
  const { week_of } = await params;
  const newsletter = await getNewsletterByWeek(week_of);

  if (!newsletter) {
    notFound();
  }

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
    </div>
  );
}
