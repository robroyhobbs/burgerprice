interface TrendArrowProps {
  change: number | null;
  size?: "sm" | "md" | "lg";
}

export function TrendArrow({ change, size = "md" }: TrendArrowProps) {
  if (change === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-gray-500">
        <span className={`bpi-number ${sizeClass(size)}`}>NEW</span>
      </span>
    );
  }

  const isPositive = change > 0;
  const isZero = change === 0;

  const color = isZero
    ? "text-gray-500"
    : isPositive
      ? "text-negative dark:text-red-400"
      : "text-lettuce dark:text-lettuce-light";

  const arrow = isZero ? "—" : isPositive ? "▲" : "▼";

  return (
    <span className={`inline-flex items-center gap-1.5 ${color}`}>
      <span className={arrowSize(size)}>{arrow}</span>
      <span className={`bpi-number font-semibold ${sizeClass(size)}`}>
        {isPositive ? "+" : ""}
        {change.toFixed(1)}%
      </span>
    </span>
  );
}

function sizeClass(size: "sm" | "md" | "lg") {
  switch (size) {
    case "sm": return "text-sm";
    case "md": return "text-base";
    case "lg": return "text-xl";
  }
}

function arrowSize(size: "sm" | "md" | "lg") {
  switch (size) {
    case "sm": return "text-xs";
    case "md": return "text-sm";
    case "lg": return "text-lg";
  }
}
