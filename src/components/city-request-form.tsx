"use client";

import { useState } from "react";

export function CityRequestForm() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !state.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/cities/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), state: state.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
        return;
      }

      if (data.isTracked) {
        setStatus("success");
        setMessage(`${city} is already tracked! Check the list above.`);
      } else {
        setStatus("success");
        setMessage(
          `Request submitted! ${city}, ${state} has ${data.requestCount}/25 requests.`,
        );
      }

      setCity("");
      setState("");
    } catch {
      setStatus("error");
      setMessage("Failed to submit request. Try again.");
    }
  }

  return (
    <div className="text-center">
      <h3 className="font-headline text-xl text-gray-900 dark:text-white mb-2">
        Don&apos;t see your city?
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        Request it! Cities with 25+ requests get added to the index.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
      >
        <input
          type="text"
          placeholder="City name"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill-light text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-ketchup/30 dark:focus:ring-mustard/30"
          required
        />
        <input
          type="text"
          placeholder="State (e.g. TX)"
          value={state}
          onChange={(e) => setState(e.target.value)}
          maxLength={2}
          className="w-full sm:w-24 px-4 py-3 rounded-xl border border-gray-200 dark:border-grill-lighter bg-white dark:bg-grill-light text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-ketchup/30 dark:focus:ring-mustard/30 uppercase"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-3 rounded-xl bg-ketchup dark:bg-mustard text-white dark:text-grill font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
        >
          {status === "loading" ? "Sending..." : "Request"}
        </button>
      </form>

      {message && (
        <p
          className={`text-sm mt-4 ${
            status === "error" ? "text-negative" : "text-lettuce dark:text-lettuce-light"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
