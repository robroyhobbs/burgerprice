import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-grill-lighter mt-12 bg-gray-50 dark:bg-grill-light">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-ketchup dark:bg-mustard rounded-lg flex items-center justify-center text-sm">
                🍔
              </div>
              <span className="font-headline text-sm text-ketchup dark:text-mustard">
                BURGER PRICE INDEX
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              Tracking the price of America&apos;s favorite food with the rigor of Wall Street and the passion of a pitmaster.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">
              Index
            </h3>
            <nav className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400">
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
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">
              Disclaimer
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
              The BPI is for entertainment and informational purposes only. Not financial advice. Past burger performance is not indicative of future burger results.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-grill-lighter flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-gray-400">
            &copy; {new Date().getFullYear()} Burger Price Index. Eat more burgers.
          </p>
          <p className="text-[10px] text-gray-300 dark:text-gray-600 bpi-number">
            Data updated weekly &middot; v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
