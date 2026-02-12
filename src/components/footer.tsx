import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-grill-lighter mt-16 bg-gray-50 dark:bg-grill-light">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-ketchup dark:bg-mustard rounded-xl flex items-center justify-center text-lg">
                🍔
              </div>
              <span className="font-headline text-base text-ketchup dark:text-mustard">
                BURGER PRICE INDEX
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              Tracking the price of America&apos;s favorite food with the rigor of Wall Street and the passion of a pitmaster.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">
              Index
            </h3>
            <nav className="flex flex-col gap-3 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/about" className="hover:text-ketchup dark:hover:text-mustard transition-colors">
                About &amp; Methodology
              </Link>
              <Link href="/about" className="hover:text-ketchup dark:hover:text-mustard transition-colors">
                Data Sources
              </Link>
            </nav>
          </div>

          {/* Disclaimer */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">
              Disclaimer
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              The BPI is for entertainment and informational purposes only. Not financial advice. Past burger performance is not indicative of future burger results.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-grill-lighter flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Burger Price Index. Eat more burgers.
          </p>
          <p className="text-xs text-gray-300 dark:text-gray-600 bpi-number">
            Data updated weekly &middot; v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
