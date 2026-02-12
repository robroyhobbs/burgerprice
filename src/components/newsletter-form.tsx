"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setMessage(data.message || "You're in!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-ketchup via-ketchup-light to-ketchup rounded-2xl p-8 md:p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-8 text-[120px] rotate-12">🍔</div>
          <div className="absolute bottom-4 left-8 text-[80px] -rotate-12">🍔</div>
        </div>

        <div className="relative text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-4">
            <span className="text-sm">📧</span>
            <span className="text-[10px] uppercase tracking-widest text-white/80 font-medium">
              Every Monday
            </span>
          </div>

          <h2 className="font-headline text-2xl md:text-3xl text-white mb-2">
            Get the Weekly BPI Report
          </h2>
          <p className="text-sm text-white/70 mb-8 max-w-md mx-auto leading-relaxed">
            Fresh price data, market analysis, and the Burger of the Week &mdash;
            delivered before your Monday lunch order.
          </p>

          {status === "success" ? (
            <div className="bg-white/15 backdrop-blur rounded-xl p-5 max-w-sm mx-auto border border-white/10">
              <span className="text-2xl block mb-1">🎉</span>
              <p className="text-white font-semibold text-sm">{message}</p>
              <p className="text-white/60 text-xs mt-1">Check your inbox on Monday.</p>
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
                className="flex-1 px-4 py-3 rounded-xl text-sm bg-white/95 dark:bg-grill text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mustard shadow-lg"
                required
                disabled={status === "loading"}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-6 py-3 bg-mustard hover:bg-mustard-light text-grill font-bold text-sm rounded-xl transition-all disabled:opacity-60 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {status === "loading" ? "..." : "Subscribe"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="text-sm text-white/80 mt-3">{message}</p>
          )}

          <p className="text-[10px] text-white/30 mt-4">
            Free forever. Unsubscribe anytime. No spam, just burgers.
          </p>
        </div>
      </div>
    </section>
  );
}
