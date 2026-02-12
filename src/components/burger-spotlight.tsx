import type { BurgerSpotlight as BurgerSpotlightType } from "@/lib/types";

interface BurgerSpotlightProps {
  spotlight: BurgerSpotlightType | null;
}

export function BurgerSpotlight({ spotlight }: BurgerSpotlightProps) {
  if (!spotlight) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-grill-lighter">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs">🏆</span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-mustard dark:text-mustard-light">
          Burger of the Week
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {spotlight.burger_name}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {spotlight.restaurant_name} &middot;{" "}
        <span className="bpi-number">${spotlight.price.toFixed(2)}</span>
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed line-clamp-3">
        {spotlight.description}
      </p>
    </div>
  );
}
