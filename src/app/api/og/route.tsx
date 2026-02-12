import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { calculateBpi, calculateChange, findExtremes } from "@/lib/bpi";
import { WEEKS, BOSTON_PRICES, SEATTLE_PRICES } from "@/lib/seed-data";

export const runtime = "edge";

function getSnapshotForCity(slug: string) {
  const priceMap = slug === "boston-ma" ? BOSTON_PRICES : SEATTLE_PRICES;
  const latestWeek = WEEKS[WEEKS.length - 1];
  const prevWeek = WEEKS[WEEKS.length - 2];

  const prices = priceMap[latestWeek];
  const prevPrices = prevWeek ? priceMap[prevWeek] : null;
  if (!prices) return null;

  const bpiScore = calculateBpi(prices);
  const prevBpi = prevPrices ? calculateBpi(prevPrices) : null;
  const changePct = calculateChange(bpiScore, prevBpi);
  const extremes = findExtremes(prices);

  return {
    bpi_score: bpiScore,
    change_pct: changePct,
    cheapest_price: extremes.cheapest.price,
    most_expensive_price: extremes.mostExpensive.price,
    week_of: latestWeek,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const citySlug = searchParams.get("city") || "boston-ma";
  const cityName = citySlug === "seattle-wa" ? "Seattle, WA" : "Boston, MA";

  const snapshot = getSnapshotForCity(citySlug);

  if (!snapshot) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#1A1A2E",
            color: "white",
          }}
        >
          <div style={{ fontSize: 64, display: "flex", alignItems: "center", gap: "16px" }}>
            <span>🍔</span>
            <span>BURGER PRICE INDEX</span>
          </div>
          <div style={{ fontSize: 24, color: "#DAA520", marginTop: 16 }}>
            burgerprice.com
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const change = snapshot.change_pct;
  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;
  const arrow = isPositive ? "▲" : isNegative ? "▼" : "";
  const changeColor = isPositive ? "#DC143C" : isNegative ? "#228B22" : "#9CA3AF";
  const changeText =
    change !== null ? `${isPositive ? "+" : ""}${change.toFixed(1)}%` : "NEW";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1A1A2E",
          color: "white",
          padding: "48px 64px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: 36 }}>🍔</span>
          <span style={{ fontSize: 28, color: "#DAA520", letterSpacing: "0.05em" }}>
            BURGER PRICE INDEX
          </span>
        </div>

        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
          <div style={{ fontSize: 24, color: "#9CA3AF", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {cityName}
          </div>
          <div style={{ fontSize: 120, fontWeight: "bold", letterSpacing: "-0.02em", display: "flex" }}>
            ${snapshot.bpi_score.toFixed(2)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 12 }}>
            <span style={{ fontSize: 28, color: changeColor }}>
              {arrow} {changeText}
            </span>
            <span style={{ fontSize: 16, color: "#6B7280" }}>
              week-over-week
            </span>
          </div>
          <div style={{ display: "flex", gap: "48px", marginTop: 24, fontSize: 16, color: "#9CA3AF" }}>
            <span style={{ display: "flex" }}>
              Low:{" "}
              <span style={{ color: "#228B22", marginLeft: "4px" }}>
                ${snapshot.cheapest_price.toFixed(2)}
              </span>
            </span>
            <span style={{ display: "flex" }}>
              High:{" "}
              <span style={{ color: "#DC143C", marginLeft: "4px" }}>
                ${snapshot.most_expensive_price.toFixed(2)}
              </span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, color: "#6B7280" }}>
            Week of {snapshot.week_of}
          </span>
          <span style={{ fontSize: 16, color: "#DAA520" }}>
            burgerprice.com
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
