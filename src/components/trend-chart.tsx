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
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-ketchup/10 dark:bg-mustard/10 flex items-center justify-center text-lg">
          📈
        </div>
        <div>
          <h2 className="font-headline text-2xl text-ketchup dark:text-mustard leading-none">
            BPI Trend
          </h2>
          <p className="text-xs text-gray-400 mt-1 bpi-number">
            {chartData.length}-week historical comparison
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-grill-light rounded-3xl border border-gray-200 dark:border-grill-lighter p-6 md:p-8">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#2E2E42" : "#E5E5E5"}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: isDark ? "#9CA3AF" : "#6B7280" }}
              tickLine={{ stroke: isDark ? "#2E2E42" : "#D1D5DB" }}
              axisLine={{ stroke: isDark ? "#2E2E42" : "#D1D5DB" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: isDark ? "#9CA3AF" : "#6B7280" }}
              tickLine={{ stroke: isDark ? "#2E2E42" : "#D1D5DB" }}
              axisLine={{ stroke: isDark ? "#2E2E42" : "#D1D5DB" }}
              tickFormatter={(v) => `$${v}`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1E1E30" : "#FFFFFF",
                border: `1px solid ${isDark ? "#2E2E42" : "#E5E5E5"}`,
                borderRadius: "12px",
                fontSize: "13px",
                padding: "12px 16px",
                color: isDark ? "#E5E5E5" : "#1A1A1A",
              }}
              formatter={(value: number | undefined) =>
                value != null ? [`$${value.toFixed(2)}`] : []
              }
            />
            <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "16px" }} />
            {cities.map((cityData) => (
              <Line
                key={cityData.city.slug}
                type="monotone"
                dataKey={cityData.city.name}
                stroke={CITY_COLORS[cityData.city.name] ?? "#8B0000"}
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: CITY_COLORS[cityData.city.name] ?? "#8B0000",
                }}
                activeDot={{ r: 7 }}
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
