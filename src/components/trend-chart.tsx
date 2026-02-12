"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

const CITY_COLORS: Record<string, string> = {
  Boston: "#8B0000", // ketchup
  Seattle: "#228B22", // lettuce
};

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

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-xl text-ketchup dark:text-mustard">
          BPI Trend
        </h2>
        <span className="text-xs text-gray-400 bpi-number">
          {chartData.length}-week history
        </span>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-xl border border-gray-200 dark:border-grill-lighter p-4 md:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#3A3A4E" : "#E5E5E5"}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: isDark ? "#9CA3AF" : "#6B7280" }}
              tickLine={{ stroke: isDark ? "#3A3A4E" : "#D1D5DB" }}
              axisLine={{ stroke: isDark ? "#3A3A4E" : "#D1D5DB" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: isDark ? "#9CA3AF" : "#6B7280" }}
              tickLine={{ stroke: isDark ? "#3A3A4E" : "#D1D5DB" }}
              axisLine={{ stroke: isDark ? "#3A3A4E" : "#D1D5DB" }}
              tickFormatter={(v) => `$${v}`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#2A2A3E" : "#FFFFFF",
                border: `1px solid ${isDark ? "#3A3A4E" : "#E5E5E5"}`,
                borderRadius: "8px",
                fontSize: "12px",
                color: isDark ? "#E5E5E5" : "#1A1A1A",
              }}
              formatter={(value: number | undefined) =>
                value != null ? [`$${value.toFixed(2)}`] : []
              }
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {cities.map((cityData) => (
              <Line
                key={cityData.city.slug}
                type="monotone"
                dataKey={cityData.city.name}
                stroke={CITY_COLORS[cityData.city.name] ?? "#8B0000"}
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: CITY_COLORS[cityData.city.name] ?? "#8B0000",
                }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
