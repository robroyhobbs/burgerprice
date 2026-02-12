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
  // Duplicate items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden bg-grill dark:bg-grill-light text-white py-1.5 border-b border-grill-lighter">
      <div className="animate-ticker flex whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 mx-6 text-xs">
            <span className="text-gray-400 font-medium">{item.label}</span>
            <span className="bpi-number text-white font-bold">{item.value}</span>
            {item.change !== null && (
              <span
                className={`bpi-number ${
                  item.change > 0
                    ? "text-red-400"
                    : item.change < 0
                      ? "text-green-400"
                      : "text-gray-400"
                }`}
              >
                {item.change > 0 ? "+" : ""}
                {item.change.toFixed(1)}%
              </span>
            )}
            <span className="text-grill-lighter ml-4">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
