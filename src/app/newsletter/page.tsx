import {
  getLatestNewsletter,
  getAllNewsletters,
} from "@/lib/newsletter-data";
import { NewsletterEdition } from "@/components/newsletter-edition";
import Link from "next/link";

export const revalidate = 3600;

export const metadata = {
  title: "BPI Weekly Newsletter | Burger Price Index",
  description:
    "The weekly Burger Price Index market report. Financial analysis of burger prices across 10 US cities, delivered with the gravitas of a Wall Street trading desk.",
};

export default async function NewsletterPage() {
  const [latest, allEditions] = await Promise.all([
    getLatestNewsletter(),
    getAllNewsletters(),
  ]);

  if (!latest) {
    return (
      <div className="min-h-screen bg-[#080810] py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-6">📰</div>
          <h1 className="font-headline text-3xl text-green-400 mb-4">
            BPI Weekly Newsletter
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            Our analysts are preparing the inaugural edition. Check back soon.
          </p>
          <Link
            href="/"
            className="text-sm text-green-500/60 hover:text-green-400 font-mono transition-colors"
          >
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Past editions = all except the latest
  const pastEditions = allEditions.filter(
    (e) => e.week_of !== latest.week_of,
  );

  return (
    <div className="min-h-screen bg-[#080810] py-10 px-6">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href="/"
          className="text-xs text-green-500/50 hover:text-green-400 font-mono transition-colors"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Latest Edition */}
      <NewsletterEdition
        weekOf={latest.week_of}
        headline={latest.headline}
        sections={latest.sections}
      />

      {/* Archive */}
      {pastEditions.length > 0 && (
        <div className="max-w-4xl mx-auto mt-12">
          <h2 className="text-[11px] text-green-500/60 font-mono font-bold uppercase tracking-[0.2em] mb-4">
            Past Editions
          </h2>
          <div className="bg-[#0d0d1a] border border-[#1a3a1a] rounded-2xl divide-y divide-[#1a3a1a]">
            {pastEditions.map((edition) => (
              <Link
                key={edition.week_of}
                href={`/newsletter/${edition.week_of}`}
                className="block px-6 py-4 hover:bg-[#0f1a0f] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-green-500/50 font-mono">
                      {new Date(
                        edition.week_of + "T00:00:00",
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <h3 className="text-sm text-gray-300 group-hover:text-green-400 transition-colors mt-0.5">
                      {edition.headline}
                    </h3>
                  </div>
                  <span className="text-green-500/30 group-hover:text-green-400 transition-colors">
                    &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
