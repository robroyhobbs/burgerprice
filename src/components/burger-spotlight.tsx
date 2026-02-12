import type { BurgerSpotlight as BurgerSpotlightType } from "@/lib/types";

interface BurgerSpotlightProps {
  spotlight: BurgerSpotlightType | null;
}

export function BurgerSpotlight({ spotlight }: BurgerSpotlightProps) {
  if (!spotlight) return null;

  return (
    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-grill-lighter">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">🏆</span>
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-mustard dark:text-mustard-light">
          Burger of the Week
        </span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {spotlight.burger_name}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {spotlight.restaurant_name}
          </p>
        </div>
        <span className="bpi-number text-sm font-bold text-mustard dark:text-mustard-light shrink-0">
          ${spotlight.price.toFixed(2)}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed line-clamp-2 italic">
        &ldquo;{spotlight.description}&rdquo;
      </p>
    </div>
  );
}
