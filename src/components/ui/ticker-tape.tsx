"use client";

interface TickerItem {
  label: string;
  value: string;
  change: number | null;
}

interface TickerTapeProps {
  items: TickerItem[];
}

export function TickerTape({ items }: TickerTapeProps) {
  // Triple items for seamless loop
  const tripled = [...items, ...items, ...items];

  return (
    <div className="overflow-hidden bg-grill text-white py-2 border-b border-white/5">
      <div className="animate-ticker flex whitespace-nowrap">
        {tripled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 mx-5 text-[11px]">
            <span className="text-gray-500 font-medium uppercase tracking-wider">{item.label}</span>
            <span className="bpi-number text-white font-semibold">{item.value}</span>
            {item.change !== null && (
              <span
                className={`bpi-number font-medium ${
                  item.change > 0
                    ? "text-red-400"
                    : item.change < 0
                      ? "text-emerald-400"
                      : "text-gray-500"
                }`}
              >
                {item.change > 0 ? "▲" : item.change < 0 ? "▼" : "—"}{" "}
                {item.change > 0 ? "+" : ""}{item.change.toFixed(1)}%
              </span>
            )}
            <span className="text-white/10 ml-3">│</span>
          </span>
        ))}
      </div>
    </div>
  );
}
