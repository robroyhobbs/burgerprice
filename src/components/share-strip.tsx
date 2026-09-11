"use client";

import { useCallback, useState } from "react";

interface ShareStripProps {
  shareUrl: string;
  caption: string;
  label?: string;
  className?: string;
}

type Flash = "link" | "caption" | "shared" | null;

export function ShareStrip({
  shareUrl,
  caption,
  label = "Share",
  className = "",
}: ShareStripProps) {
  const [flash, setFlash] = useState<Flash>(null);

  const pulse = useCallback((kind: Flash) => {
    setFlash(kind);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  const copyText = useCallback(async (text: string, kind: Flash) => {
    try {
      await navigator.clipboard.writeText(text);
      pulse(kind);
    } catch {
      // Fallback for older browsers / insecure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        pulse(kind);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }, [pulse]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Burger Price Index",
          text: caption,
          url: shareUrl,
        });
        pulse("shared");
        return;
      } catch (err) {
        // User cancelled — don't fall through to copy spam
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await copyText(caption, "caption");
  }, [caption, shareUrl, copyText, pulse]);

  return (
    <div
      className={`mt-8 rounded-2xl border border-gray-200 dark:border-grill-lighter bg-white/80 dark:bg-grill-light/80 backdrop-blur-sm px-5 py-4 md:px-6 md:py-5 ${className}`.trim()}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 font-medium mb-1.5">
            {label}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-body">
            {caption}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => copyText(shareUrl, "link")}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-grill-lighter bg-paper dark:bg-grill px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:border-mustard hover:text-ketchup dark:hover:text-mustard transition-colors"
          >
            {flash === "link" ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => copyText(caption, "caption")}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-grill-lighter bg-paper dark:bg-grill px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:border-mustard hover:text-ketchup dark:hover:text-mustard transition-colors"
          >
            {flash === "caption" ? "Copied" : "Copy caption"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-ketchup to-ketchup-light dark:from-mustard dark:to-mustard-light text-white dark:text-grill px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-md shadow-ketchup/20 dark:shadow-mustard/20 hover:opacity-95 transition-opacity"
          >
            {flash === "shared" ? "Shared" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
