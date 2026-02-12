import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper dark:bg-grill">
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

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-sm md:text-base leading-relaxed text-gray-700 dark:text-gray-300">
          <h2 className="font-headline text-xl text-gray-900 dark:text-white">What is the BPI?</h2>
          <p>
            The Burger Price Index (BPI) is a weekly index that tracks the average
            cost of a burger across US cities. Think of it as the Consumer Price
            Index, but exclusively for the most important food group: burgers.
          </p>
          <p>
            We currently track <strong>Boston, MA</strong> and{" "}
            <strong>Seattle, WA</strong>, with plans to expand to additional cities.
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
      </div>
    </div>
  );
}
