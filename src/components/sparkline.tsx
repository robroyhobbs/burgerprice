"use client";

import { useState, useRef } from "react";
import type { NationalBpiPoint } from "@/lib/types";

interface SparklineProps {
  data: NationalBpiPoint[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 280, height = 60 }: SparklineProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: NationalBpiPoint;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length === 0) return null;

  const padding = { top: 4, right: 4, bottom: 4, left: 4 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.avg_bpi);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: padding.top + chartH - ((d.avg_bpi - min) / range) * chartH,
    data: d,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Gradient fill area
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find nearest point
    let closest = points[0];
    let closestDist = Infinity;
    for (const p of points) {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = p;
      }
    }

    setTooltip({ x: closest.x, y: closest.y, point: closest.data });
  };

  const isUp =
    data.length >= 2 && data[data.length - 1].avg_bpi >= data[data.length - 2].avg_bpi;
  const strokeColor = isUp ? "var(--color-negative)" : "var(--color-lettuce)";

  return (
    <div className="relative inline-block">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sparkFill)" />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              y1={padding.top}
              x2={tooltip.x}
              y2={height - padding.bottom}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.2"
              strokeDasharray="2 2"
            />
            <circle cx={tooltip.x} cy={tooltip.y} r="4" fill={strokeColor} stroke="white" strokeWidth="1.5" />
          </>
        )}
      </svg>
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-grill dark:bg-white text-white dark:text-grill text-xs px-2 py-1 rounded-md shadow-lg bpi-number whitespace-nowrap z-10"
          style={{
            left: Math.min(tooltip.x, width - 80),
            top: -28,
          }}
        >
          {new Date(tooltip.point.week_of + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          &middot; ${tooltip.point.avg_bpi.toFixed(2)}
        </div>
      )}
    </div>
  );
}
