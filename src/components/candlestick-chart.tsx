"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CityDashboardData } from "@/lib/types";
import { useTheme } from "./theme-provider";

interface CandlestickChartProps {
  cities: CityDashboardData[];
}

// Colors for multi-city candles
const CITY_COLORS = [
  { up: "#dc2626", down: "#16a34a" }, // red up / green down
  { up: "#c2410c", down: "#0d9488" }, // orange-red up / teal down
  { up: "#be185d", down: "#0891b2" }, // pink up / cyan down
];

function getCityColors(index: number) {
  return CITY_COLORS[index % CITY_COLORS.length];
}

interface CandleShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Record<string, number | string>;
  prefix: string;
  colorIndex: number;
}

function CandleShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  prefix,
  colorIndex,
}: CandleShapeProps) {
  if (!payload || height === 0) return null;

  const open = Number(payload[`${prefix}_open`]) || 0;
  const close = Number(payload[`${prefix}_close`]) || 0;
  const high = Number(payload[`${prefix}_high`]) || 0;
  const low = Number(payload[`${prefix}_low`]) || 0;

  if (high === low || high === 0) return null;

  const colors = getCityColors(colorIndex);
  const color = close >= open ? colors.up : colors.down;

  // y and height represent the full range [low, high] mapped to pixels
  // y = top of bar (corresponds to high value)
  // y + height = bottom of bar (corresponds to low value)
  const pixelsPerDollar = height / (high - low);

  // Body position within the wick
  const bodyTop = y + (high - Math.max(open, close)) * pixelsPerDollar;
  const bodyBottom = y + (high - Math.min(open, close)) * pixelsPerDollar;
  const bodyHeight = Math.max(bodyBottom - bodyTop, 2); // min 2px visible

  // Wick center
  const wickX = x + width / 2;

  return (
    <g>
      {/* Upper wick */}
      <line
        x1={wickX}
        y1={y}
        x2={wickX}
        y2={bodyTop}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Lower wick */}
      <line
        x1={wickX}
        y1={bodyBottom}
        x2={wickX}
        y2={y + height}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Body */}
      <rect
        x={x + 1}
        y={bodyTop}
        width={Math.max(width - 2, 4)}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
        rx={2}
      />
    </g>
  );
}

export function CandlestickChart({ cities }: CandlestickChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Collect all weeks across cities
  const weekSet = new Set<string>();
  for (const cityData of cities) {
    for (const s of cityData.history) {
      weekSet.add(s.week_of);
    }
  }
  const weeks = [...weekSet].sort();

  // Build chart data
  const chartData: Record<string, string | number | [number, number]>[] = [];

  for (const week of weeks) {
    const point: Record<string, string | number | [number, number]> = {
      week: formatWeek(week),
    };

    for (const cityData of cities) {
      const idx = cityData.history.findIndex((s) => s.week_of === week);
      if (idx === -1) continue;

      const s = cityData.history[idx];
      const prevBpi =
        idx > 0 ? cityData.history[idx - 1].bpi_score : s.bpi_score;
      const prefix = cityData.city.slug;

      // Range bar: [low, high] for the full candle extent
      point[`${prefix}_range`] = [s.cheapest_price, s.most_expensive_price];
      point[`${prefix}_open`] = prevBpi;
      point[`${prefix}_close`] = s.bpi_score;
      point[`${prefix}_high`] = s.most_expensive_price;
      point[`${prefix}_low`] = s.cheapest_price;
    }

    chartData.push(point);
  }

  if (chartData.length === 0) return null;

  // Calculate Y domain from all values
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const point of chartData) {
    for (const cityData of cities) {
      const prefix = cityData.city.slug;
      const range = point[`${prefix}_range`];
      if (Array.isArray(range)) {
        minVal = Math.min(minVal, range[0]);
        maxVal = Math.max(maxVal, range[1]);
      }
    }
  }
  minVal = Math.floor(minVal - 1);
  maxVal = Math.ceil(maxVal + 1);

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
            📊
          </div>
          <div>
            <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
              BPI Candlestick
            </h2>
            <p className="text-xs text-gray-400 mt-1 bpi-number">
              {chartData.length}-week OHLC &middot; body = BPI movement &middot;
              wicks = price spread
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-5">
          {cities.map((c, i) => {
            const colors = getCityColors(i);
            return (
              <div key={c.city.slug} className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div
                    className="w-2 h-4 rounded-sm"
                    style={{ backgroundColor: colors.up }}
                  />
                  <div
                    className="w-2 h-4 rounded-sm"
                    style={{ backgroundColor: colors.down }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {c.city.name}
                </span>
                {c.currentSnapshot && (
                  <span className="bpi-number text-xs font-bold text-gray-700 dark:text-gray-200">
                    ${c.currentSnapshot.bpi_score.toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 border-l border-gray-200 dark:border-grill-lighter pl-4">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#dc2626" }}
            />
            <span>Up</span>
            <span
              className="w-2 h-2 rounded-full ml-1"
              style={{ backgroundColor: "#16a34a" }}
            />
            <span>Down</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter p-6 md:p-8">
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 5, left: 10 }}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#2E2E42" : "#F0F0F0"}
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: isDark ? "#6B7280" : "#9CA3AF" }}
              tickLine={false}
              axisLine={{ stroke: isDark ? "#2E2E42" : "#E5E5E5" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: isDark ? "#6B7280" : "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              domain={[minVal, maxVal]}
              width={50}
            />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || payload.length === 0) return null;
                const data = payload[0]?.payload;
                if (!data) return null;
                return (
                  <div
                    className="rounded-2xl p-4 text-sm shadow-xl border"
                    style={{
                      backgroundColor: isDark ? "#1E1E30" : "#FFFFFF",
                      borderColor: isDark ? "#2E2E42" : "#E5E7EB",
                      color: isDark ? "#E5E5E5" : "#1A1A1A",
                    }}
                  >
                    <div className="font-semibold mb-2">{label}</div>
                    {cities.map((c, i) => {
                      const prefix = c.city.slug;
                      const open = data[`${prefix}_open`];
                      const close = data[`${prefix}_close`];
                      const high = data[`${prefix}_high`];
                      const low = data[`${prefix}_low`];
                      if (open == null) return null;
                      const colors = getCityColors(i);
                      const color =
                        Number(close) >= Number(open) ? colors.up : colors.down;
                      return (
                        <div key={prefix} className="mb-1.5 last:mb-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-medium">{c.city.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs pl-3.5 bpi-number">
                            <span className="text-gray-400">Open:</span>
                            <span>${Number(open).toFixed(2)}</span>
                            <span className="text-gray-400">Close:</span>
                            <span className="font-bold">
                              ${Number(close).toFixed(2)}
                            </span>
                            <span className="text-gray-400">High:</span>
                            <span>${Number(high).toFixed(2)}</span>
                            <span className="text-gray-400">Low:</span>
                            <span>${Number(low).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
              cursor={{
                fill: isDark ? "rgba(58,58,78,0.3)" : "rgba(209,213,219,0.3)",
              }}
            />
            {cities.map((cityData, i) => (
              <Bar
                key={cityData.city.slug}
                dataKey={`${cityData.city.slug}_range`}
                shape={
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ((props: any) => (
                    <CandleShape
                      {...props}
                      prefix={cityData.city.slug}
                      colorIndex={i}
                    />
                  )) as any
                }
                isAnimationActive={false}
              />
            ))}
            {/* BPI trend line overlay */}
            {cities.map((cityData, i) => {
              const colors = getCityColors(i);
              return (
                <Line
                  key={`line-${cityData.city.slug}`}
                  type="monotone"
                  dataKey={`${cityData.city.slug}_close`}
                  stroke={isDark ? "#9CA3AF" : "#6B7280"}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={{
                    r: 3,
                    fill: isDark ? "#1E1E30" : "#FFFFFF",
                    stroke: colors.up,
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5,
                    fill: colors.up,
                    stroke: isDark ? "#1E1E30" : "#FFFFFF",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
