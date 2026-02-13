import type {
  BurgerSpotlight as BurgerSpotlightType,
  RawPrice,
} from "@/lib/types";
import { getRestaurantUrl } from "@/lib/restaurant-utils";

interface BurgerSpotlightProps {
  spotlight: BurgerSpotlightType | null;
  cityName?: string;
  cityState?: string;
  rawPrices?: RawPrice[];
}

export function BurgerSpotlight({
  spotlight,
  cityName,
  cityState,
  rawPrices,
}: BurgerSpotlightProps) {
  if (!spotlight) return null;

  const website =
    rawPrices?.find(
      (p) => p.restaurant === spotlight.restaurant_name && p.website,
    )?.website ?? null;

  const restaurantUrl =
    cityName && cityState
      ? getRestaurantUrl(
          spotlight.restaurant_name,
          cityName,
          cityState,
          website,
        )
      : null;

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
          <p className="text-sm mt-1">
            {restaurantUrl ? (
              <a
                href={restaurantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-mustard dark:hover:text-mustard-light transition-colors underline decoration-dotted underline-offset-2"
              >
                {spotlight.restaurant_name}
              </a>
            ) : (
              <span className="text-gray-400">{spotlight.restaurant_name}</span>
            )}
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
