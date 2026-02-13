import type { PurchasingPowerEntry } from "@/lib/types";
import Link from "next/link";

interface PurchasingPowerProps {
  data: PurchasingPowerEntry[];
}

function BurgerIcons({ count }: { count: number }) {
  const full = Math.floor(count);
  const hasHalf = count - full >= 0.25;
  const icons: React.ReactNode[] = [];

  for (let i = 0; i < full && i < 10; i++) {
    icons.push(
      <span key={`full-${i}`} className="text-lg">
        🍔
      </span>,
    );
  }
  if (hasHalf) {
    icons.push(
      <span key="half" className="text-lg opacity-40">
        🍔
      </span>,
    );
  }

  return <div className="flex flex-wrap gap-0.5">{icons}</div>;
}

export function PurchasingPower({ data }: PurchasingPowerProps) {
  if (data.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          💪
        </div>
        <div>
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
            Burger Purchasing Power
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            How many burgers can minimum wage buy per hour?
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((entry, i) => (
          <Link
            key={entry.slug}
            href={`/cities/${entry.slug}`}
            className="bg-white dark:bg-grill-light rounded-2xl border border-gray-200 dark:border-grill-lighter p-5 hover:border-ketchup/30 dark:hover:border-mustard/30 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {entry.city}, {entry.state}
                </p>
                <p className="text-xs text-gray-400">
                  Min wage: ${entry.min_wage.toFixed(2)}/hr
                </p>
              </div>
              <div className="text-right">
                <span className="bpi-number text-xl font-bold text-ketchup dark:text-mustard">
                  {entry.burgers_per_hour.toFixed(1)}
                </span>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  burgers/hr
                </p>
              </div>
            </div>
            <BurgerIcons count={entry.burgers_per_hour} />
            {i === 0 && (
              <div className="mt-2 inline-block px-2 py-0.5 bg-lettuce/10 text-lettuce dark:text-lettuce-light text-[10px] font-bold uppercase tracking-wider rounded-full">
                Best value
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
