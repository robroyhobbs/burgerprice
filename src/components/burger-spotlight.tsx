import type { BurgerSpotlight as BurgerSpotlightType } from "@/lib/types";

interface BurgerSpotlightProps {
  spotlight: BurgerSpotlightType | null;
}

export function BurgerSpotlight({ spotlight }: BurgerSpotlightProps) {
  if (!spotlight) return null;

  return (
    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-grill-lighter">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🏆</span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-mustard dark:text-mustard-light">
          Burger of the Week
        </span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {spotlight.burger_name}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {spotlight.restaurant_name}
          </p>
        </div>
        <span className="bpi-number text-lg font-bold text-mustard dark:text-mustard-light shrink-0">
          ${spotlight.price.toFixed(2)}
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed italic">
        &ldquo;{spotlight.description}&rdquo;
      </p>
    </div>
  );
}
