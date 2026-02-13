"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CityDashboardData } from "@/lib/types";
import { useTheme } from "./theme-provider";

interface TrendChartProps {
  cities: CityDashboardData[];
}

interface ChartDataPoint {
  week: string;
  [key: string]: string | number;
}

// Rotating color palette for any number of cities
const CITY_COLORS = [
  "#8B0000",
  "#228B22",
  "#1E40AF",
  "#B45309",
  "#7C3AED",
  "#BE185D",
  "#0E7490",
  "#4338CA",
  "#A16207",
  "#059669",
];

function getCityColor(index: number): string {
  return CITY_COLORS[index % CITY_COLORS.length];
}

export function TrendChart({ cities }: TrendChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Build chart data from city histories
  const weekMap = new Map<string, ChartDataPoint>();

  for (const cityData of cities) {
    for (const snapshot of cityData.history) {
      const key = snapshot.week_of;
      if (!weekMap.has(key)) {
        weekMap.set(key, { week: formatWeek(key) });
      }
      const point = weekMap.get(key)!;
      point[cityData.city.name] = snapshot.bpi_score;
    }
  }

  const chartData = Array.from(weekMap.values()).sort((a, b) =>
    a.week.localeCompare(b.week),
  );

  if (chartData.length === 0) return null;

  // Calculate min/max for domain with padding
  const allValues = chartData.flatMap((d) =>
    cities.map((c) => Number(d[c.city.name]) || 0).filter((v) => v > 0),
  );
  const minVal = Math.floor(Math.min(...allValues) - 1);
  const maxVal = Math.ceil(Math.max(...allValues) + 1);

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
            📈
          </div>
          <div>
            <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
              BPI Trend
            </h2>
            <p className="text-xs text-gray-400 mt-1 bpi-number">
              {chartData.length}-week price index history
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-5">
          {cities.map((c, i) => {
            const color = getCityColor(i);
            return (
              <div key={c.city.slug} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {c.city.name}, {c.city.state}
                </span>
                {c.currentSnapshot && (
                  <span className="bpi-number text-xs font-bold text-gray-700 dark:text-gray-200">
                    ${c.currentSnapshot.bpi_score.toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter p-6 md:p-8">
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 5, left: 10 }}
          >
            <defs>
              {cities.map((cityData, i) => {
                const color = getCityColor(i);
                return (
                  <linearGradient
                    key={cityData.city.slug}
                    id={`gradient-${cityData.city.slug}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                  </linearGradient>
                );
              })}
            </defs>
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
              contentStyle={{
                backgroundColor: isDark ? "#1E1E30" : "#FFFFFF",
                border: "none",
                borderRadius: "16px",
                fontSize: "13px",
                padding: "14px 18px",
                color: isDark ? "#E5E5E5" : "#1A1A1A",
                boxShadow: isDark
                  ? "0 8px 32px rgba(0,0,0,0.5)"
                  : "0 8px 32px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number | undefined) =>
                value != null ? [`$${value.toFixed(2)}`] : []
              }
              cursor={{
                stroke: isDark ? "#3A3A4E" : "#D1D5DB",
                strokeWidth: 1,
              }}
            />
            {cities.map((cityData, i) => {
              const color = getCityColor(i);
              return (
                <Area
                  key={cityData.city.slug}
                  type="monotone"
                  dataKey={cityData.city.name}
                  stroke={color}
                  strokeWidth={2.5}
                  fill={`url(#gradient-${cityData.city.slug})`}
                  dot={{
                    r: 4,
                    fill: isDark ? "#1E1E30" : "#FFFFFF",
                    stroke: color,
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: color,
                    stroke: isDark ? "#1E1E30" : "#FFFFFF",
                    strokeWidth: 2,
                  }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
