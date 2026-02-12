"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic client-side validation
    if (!email || !email.includes("@") || !email.includes(".")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("You're in! Watch for the weekly BPI report.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-ketchup dark:bg-ketchup-light rounded-xl p-8 md:p-12 text-center">
        <span className="text-3xl mb-3 block">📧</span>
        <h2 className="font-headline text-2xl md:text-3xl text-white mb-2">
          Get the Weekly BPI Report
        </h2>
        <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
          Every Monday, get the latest Burger Price Index data, market analysis,
          and the Burger of the Week delivered to your inbox.
        </p>

        {status === "success" ? (
          <div className="bg-white/20 rounded-lg p-4 max-w-md mx-auto">
            <span className="text-lg">🎉</span>
            <p className="text-white font-medium mt-1">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="your@email.com"
              className="flex-1 px-4 py-3 rounded-lg text-sm bg-white dark:bg-grill text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mustard"
              required
              disabled={status === "loading"}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-6 py-3 bg-mustard hover:bg-mustard-light text-grill font-bold text-sm rounded-lg transition-colors disabled:opacity-60"
            >
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-sm text-white/90 mt-2">{message}</p>
        )}
      </div>
    </section>
  );
}
