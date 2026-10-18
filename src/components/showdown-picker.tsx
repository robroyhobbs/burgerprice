"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PickerCity {
  slug: string;
  name: string;
  state: string;
}

interface ShowdownPickerProps {
  cities: PickerCity[];
  leftSlug: string;
  rightSlug: string;
  /** True when the current pair is not this week's rotation. */
  isCustom: boolean;
}

const selectClass =
  "w-full sm:w-56 rounded-2xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill-light px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ketchup/40 dark:focus:ring-mustard/40";

export function ShowdownPicker({
  cities,
  leftSlug,
  rightSlug,
  isCustom,
}: ShowdownPickerProps) {
  const router = useRouter();
  const [left, setLeft] = useState(leftSlug);
  const [right, setRight] = useState(rightSlug);

  const same = left === right;
  const unchanged = left === leftSlug && right === rightSlug;

  function go(a: string, b: string) {
    if (!a || !b || a === b) return;
    router.push(`/?showdown=${encodeURIComponent(`${a},${b}`)}#city-showdown`);
  }

  function swap() {
    setLeft(right);
    setRight(left);
    go(right, left);
  }

  return (
    <div className="mt-10 rounded-3xl border border-gray-200 dark:border-grill-lighter bg-white/60 dark:bg-grill-light/60 p-5 md:p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 font-medium text-center mb-4">
        Pick your own matchup
      </p>
      <form
        className="flex flex-col sm:flex-row items-center justify-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          go(left, right);
        }}
      >
        <label className="sr-only" htmlFor="showdown-left">
          First city
        </label>
        <select
          id="showdown-left"
          className={selectClass}
          value={left}
          onChange={(e) => setLeft(e.target.value)}
        >
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}, {c.state}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={swap}
          className="shrink-0 rounded-full border border-gray-200 dark:border-grill-lighter px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-ketchup dark:hover:text-mustard transition-colors"
          aria-label="Swap sides"
          title="Swap sides"
        >
          ⇄ Swap
        </button>

        <label className="sr-only" htmlFor="showdown-right">
          Second city
        </label>
        <select
          id="showdown-right"
          className={selectClass}
          value={right}
          onChange={(e) => setRight(e.target.value)}
        >
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}, {c.state}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={same || unchanged}
          className="shrink-0 rounded-2xl bg-gradient-to-r from-ketchup to-ketchup-light dark:from-mustard dark:to-mustard-light px-5 py-2.5 text-sm font-bold text-white dark:text-grill shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Run the tape
        </button>
      </form>
      <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500 min-h-[1rem]">
        {same ? (
          "A city can't trade against itself. Pick two different markets."
        ) : isCustom ? (
          <>
            Custom matchup. The link is shareable.{" "}
            <Link
              href="/#city-showdown"
              className="underline underline-offset-2 hover:text-ketchup dark:hover:text-mustard"
            >
              Back to this week&apos;s pair
            </Link>
          </>
        ) : (
          "Any two tracked cities, same weekly print. Every matchup gets its own link."
        )}
      </p>
    </div>
  );
}
