import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import {
  getDashboardData,
  getCityBySlug,
  getNationalBpiHistory,
} from "@/lib/data";
import { getShowdownIndices, isShowdownRequest, parseShowdownPair } from "@/lib/showdown";

export const runtime = "nodejs";

function formatWeek(weekOf: string): string {
  const d = new Date(`${weekOf}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return weekOf;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function changeParts(change: number | null | undefined) {
  if (change == null || Number.isNaN(change)) {
    return { arrow: "", text: "NEW", color: "#9CA3AF" };
  }
  const isPositive = change > 0;
  const isNegative = change < 0;
  return {
    arrow: isPositive ? "▲" : isNegative ? "▼" : "",
    text: `${isPositive ? "+" : ""}${change.toFixed(1)}%`,
    color: isPositive ? "#DC143C" : isNegative ? "#228B22" : "#9CA3AF",
  };
}

function BrandHeader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
      }}
    >
      <span style={{ fontSize: 36 }}>🍔</span>
      <span
        style={{
          fontSize: 28,
          color: "#DAA520",
          letterSpacing: "0.05em",
        }}
      >
        BURGER PRICE INDEX
      </span>
    </div>
  );
}

function FallbackCard() {
  return (
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
      <div
        style={{
          fontSize: 64,
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <span>🍔</span>
        <span>BURGER PRICE INDEX</span>
      </div>
      <div style={{ fontSize: 24, color: "#DAA520", marginTop: 16 }}>
        burgerprice.com
      </div>
    </div>
  );
}

function NationalCard(props: {
  avgBpi: number;
  changePct: number | null;
  weekOf: string;
  cityCount: number;
}) {
  const change = changeParts(props.changePct);
  return (
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
      <BrandHeader />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: "#9CA3AF",
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          National BPI
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: "bold",
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          ${props.avgBpi.toFixed(2)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 28, color: change.color }}>
            {change.arrow} {change.text}
          </span>
          <span style={{ fontSize: 16, color: "#6B7280" }}>week-over-week</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 18,
            color: "#9CA3AF",
          }}
        >
          Avg across {props.cityCount} cities
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 16, color: "#6B7280" }}>
          Week of {formatWeek(props.weekOf)}
        </span>
        <span style={{ fontSize: 16, color: "#DAA520" }}>burgerprice.com</span>
      </div>
    </div>
  );
}

function CityCard(props: {
  cityLabel: string;
  bpi: number;
  changePct: number | null;
  weekOf: string;
  low?: number | null;
  high?: number | null;
}) {
  const change = changeParts(props.changePct);
  return (
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
      <BrandHeader />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: "#9CA3AF",
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {props.cityLabel}
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: "bold",
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          ${props.bpi.toFixed(2)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 28, color: change.color }}>
            {change.arrow} {change.text}
          </span>
          <span style={{ fontSize: 16, color: "#6B7280" }}>week-over-week</span>
        </div>
        {(props.low != null || props.high != null) && (
          <div
            style={{
              display: "flex",
              gap: "48px",
              marginTop: 24,
              fontSize: 16,
              color: "#9CA3AF",
            }}
          >
            {props.low != null && (
              <span style={{ display: "flex" }}>
                Low:{" "}
                <span style={{ color: "#228B22", marginLeft: "4px" }}>
                  ${props.low.toFixed(2)}
                </span>
              </span>
            )}
            {props.high != null && (
              <span style={{ display: "flex" }}>
                High:{" "}
                <span style={{ color: "#DC143C", marginLeft: "4px" }}>
                  ${props.high.toFixed(2)}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 16, color: "#6B7280" }}>
          Week of {formatWeek(props.weekOf)}
        </span>
        <span style={{ fontSize: 16, color: "#DAA520" }}>burgerprice.com</span>
      </div>
    </div>
  );
}

function ShowdownCard(props: {
  leftLabel: string;
  leftBpi: number;
  leftChange: number | null;
  rightLabel: string;
  rightBpi: number;
  rightChange: number | null;
  weekOf: string;
}) {
  const left = changeParts(props.leftChange);
  const right = changeParts(props.rightChange);
  return (
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
      <BrandHeader />
      <div
        style={{
          display: "flex",
          fontSize: 18,
          color: "#DAA520",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          marginBottom: 8,
        }}
      >
        This Week's Matchup
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#9CA3AF",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {props.leftLabel}
          </div>
          <div style={{ fontSize: 72, fontWeight: "bold", display: "flex" }}>
            ${props.leftBpi.toFixed(2)}
          </div>
          <div style={{ fontSize: 22, color: left.color, marginTop: 8 }}>
            {left.arrow} {left.text}
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#DAA520",
            fontWeight: "bold",
            letterSpacing: "0.1em",
          }}
        >
          VS
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#9CA3AF",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {props.rightLabel}
          </div>
          <div style={{ fontSize: 72, fontWeight: "bold", display: "flex" }}>
            ${props.rightBpi.toFixed(2)}
          </div>
          <div style={{ fontSize: 22, color: right.color, marginTop: 8 }}>
            {right.arrow} {right.text}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 16, color: "#6B7280" }}>
          Weekly Showdown · {formatWeek(props.weekOf)}
        </span>
        <span style={{ fontSize: 16, color: "#DAA520" }}>burgerprice.com</span>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const citySlug = searchParams.get("city");
  const type = searchParams.get("type");
  const showdownParam = searchParams.get("showdown");
  const leftSlugParam = searchParams.get("left");
  const rightSlugParam = searchParams.get("right");
  const showdownMode = isShowdownRequest({
    showdown: showdownParam,
    type,
    left: leftSlugParam,
    right: rightSlugParam,
  });

  try {
    // Explicit city pair / weekly showdown before single-city card
    if (showdownMode) {
      const data = await getDashboardData();
      if (data.cities.length >= 2) {
        const pairSlugs = parseShowdownPair(
          showdownParam,
          leftSlugParam,
          rightSlugParam,
        );
        let left = null as (typeof data.cities)[number] | null;
        let right = null as (typeof data.cities)[number] | null;

        if (pairSlugs) {
          left = data.cities.find((c) => c.city.slug === pairSlugs[0]) ?? null;
          right = data.cities.find((c) => c.city.slug === pairSlugs[1]) ?? null;
          // Fall back to getCityBySlug if not in this week's dashboard slice
          if (!left) {
            const fetched = await getCityBySlug(pairSlugs[0]);
            if (fetched) left = fetched;
          }
          if (!right) {
            const fetched = await getCityBySlug(pairSlugs[1]);
            if (fetched) right = fetched;
          }
        } else {
          const [idx1, idx2] = getShowdownIndices(
            data.weekOf,
            data.cities.length,
          );
          left = data.cities[idx1] ?? null;
          right = data.cities[idx2] ?? null;
        }

        const leftSnap = left?.currentSnapshot;
        const rightSnap = right?.currentSnapshot;
        if (left && right && leftSnap && rightSnap) {
          return new ImageResponse(
            (
              <ShowdownCard
                leftLabel={`${left.city.name}, ${left.city.state}`}
                leftBpi={leftSnap.bpi_score}
                leftChange={leftSnap.change_pct}
                rightLabel={`${right.city.name}, ${right.city.state}`}
                rightBpi={rightSnap.bpi_score}
                rightChange={rightSnap.change_pct}
                weekOf={leftSnap.week_of || data.weekOf}
              />
            ),
            { width: 1200, height: 630 },
          );
        }
      }
    }

    if (citySlug) {
      const cityData = await getCityBySlug(citySlug);
      const snap = cityData?.currentSnapshot;
      if (cityData && snap) {
        return new ImageResponse(
          (
            <CityCard
              cityLabel={`${cityData.city.name}, ${cityData.city.state}`}
              bpi={snap.bpi_score}
              changePct={snap.change_pct}
              weekOf={snap.week_of}
              low={snap.cheapest_price}
              high={snap.most_expensive_price}
            />
          ),
          { width: 1200, height: 630 },
        );
      }
    }

    const data = await getDashboardData();
    const history = getNationalBpiHistory(data.cities);
    const latest = history[history.length - 1];
    const previous = history.length >= 2 ? history[history.length - 2] : null;

    if (latest) {
      const changePct =
        previous && previous.avg_bpi !== 0
          ? Math.round(
              ((latest.avg_bpi - previous.avg_bpi) / previous.avg_bpi) * 1000,
            ) / 10
          : null;
      return new ImageResponse(
        (
          <NationalCard
            avgBpi={latest.avg_bpi}
            changePct={changePct}
            weekOf={latest.week_of}
            cityCount={latest.city_count}
          />
        ),
        { width: 1200, height: 630 },
      );
    }
  } catch {
    // Fall through to brand fallback — never 500 a share preview.
  }

  return new ImageResponse(<FallbackCard />, { width: 1200, height: 630 });
}
