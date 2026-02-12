import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-grill-lighter mt-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍔</span>
            <span className="font-headline text-sm text-ketchup dark:text-mustard">
              BURGER PRICE INDEX
            </span>
          </div>

          <nav className="flex gap-6 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/about" className="hover:text-ketchup dark:hover:text-mustard transition-colors">
              About & Methodology
            </Link>
          </nav>

          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Data updated weekly. Not financial advice. Eat more burgers.
          </p>
        </div>
      </div>
    </footer>
  );
}
