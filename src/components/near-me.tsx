"use client";

import { useState } from "react";
import type { City } from "@/lib/types";

interface NearMeProps {
  cities: City[];
  onFound: (slug: string, distanceMiles: number) => void;
}

export function NearMeButton({ cities, onFound }: NearMeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearest(latitude, longitude, cities);
        setLoading(false);
        if (nearest) {
          onFound(nearest.slug, nearest.distance);
        }
      },
      () => {
        setLoading(false);
        setError("Location access denied. Try searching instead.");
      },
      { timeout: 5000 },
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-5 py-3 rounded-2xl bg-ketchup dark:bg-mustard text-white dark:text-grill font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Finding..." : "📍 Find Burgers Near Me"}
      </button>
      {error && (
        <p className="text-xs text-gray-400">{error}</p>
      )}
    </div>
  );
}

function findNearest(
  lat: number,
  lng: number,
  cities: City[],
): { slug: string; distance: number } | null {
  let best: { slug: string; distance: number } | null = null;

  for (const city of cities) {
    if (city.lat == null || city.lng == null) continue;
    const d = haversine(lat, lng, city.lat, city.lng);
    if (!best || d < best.distance) {
      best = { slug: city.slug, distance: Math.round(d) };
    }
  }

  return best;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
