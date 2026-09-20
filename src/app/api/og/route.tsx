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
        Weekly Matchup
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
              display: "flex",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: 22,
              color: left.color,
              marginTop: 8,
            }}
          >
            <span style={{ display: "flex" }}>{left.arrow}</span>
            <span style={{ display: "flex" }}>{left.text}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
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
              display: "flex",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: 22,
              color: right.color,
              marginTop: 8,
            }}
          >
            <span style={{ display: "flex" }}>{right.arrow}</span>
            <span style={{ display: "flex" }}>{right.text}</span>
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
        <span style={{ display: "flex", fontSize: 16, color: "#6B7280" }}>
          Weekly Showdown · {formatWeek(props.weekOf)}
        </span>
        <span style={{ display: "flex", fontSize: 16, color: "#DAA520" }}>
          burgerprice.com
        </span>
      </div>
    </div>
  );
}


function RankingsCard(props: {
  weekOf: string;
  avgBpi: number;
  changePct: number | null;
  cityCount: number;
  rows: { rank: number; label: string; bpi: number; changePct: number | null }[];
  highLabel: string;
  highBpi: number;
  lowLabel: string;
  lowBpi: number;
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
        padding: "40px 56px",
      }}
    >
      <BrandHeader />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#DAA520",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 8,
            }}
          >
            Weekly City Rankings
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 56, fontWeight: "bold", display: "flex" }}>
              ${props.avgBpi.toFixed(2)}
            </span>
            <span style={{ fontSize: 22, color: change.color, display: "flex" }}>
              {change.arrow} {change.text}
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 16, color: "#9CA3AF", marginTop: 4 }}>
            National BPI · {props.cityCount} cities · week of {formatWeek(props.weekOf)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 14, color: "#9CA3AF" }}>
            High {props.highLabel} ${props.highBpi.toFixed(2)}
          </div>
          <div style={{ display: "flex", fontSize: 14, color: "#9CA3AF" }}>
            Low {props.lowLabel} ${props.lowBpi.toFixed(2)}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 10,
          justifyContent: "center",
        }}
      >
        {props.rows.map((row) => {
          const rowChange = changeParts(row.changePct);
          return (
            <div
              key={row.rank}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(218,165,32,0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: "bold",
                    color: "#DAA520",
                    width: 36,
                  }}
                >
                  #{row.rank}
                </span>
                <span style={{ display: "flex", fontSize: 26, fontWeight: 600 }}>
                  {row.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ display: "flex", fontSize: 28, fontWeight: "bold" }}>
                  ${row.bpi.toFixed(2)}
                </span>
                <span style={{ display: "flex", fontSize: 18, color: rowChange.color, width: 90 }}>
                  {rowChange.arrow} {rowChange.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <span style={{ display: "flex", fontSize: 16, color: "#6B7280" }}>
          Full board on the tape
        </span>
        <span style={{ display: "flex", fontSize: 16, color: "#DAA520" }}>
          burgerprice.com/rankings
        </span>
      </div>
    </div>
  );
}



function CitiesCard(props: {
  weekOf: string;
  avgBpi: number;
  changePct: number | null;
  cityCount: number;
  valueLabel: string;
  valueBpi: number;
  premiumLabel: string;
  premiumBpi: number;
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
          fontSize: 18,
          color: "#DAA520",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          marginBottom: 12,
        }}
      >
        All Cities
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          National BPI
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: 96, fontWeight: "bold", display: "flex" }}>
            ${props.avgBpi.toFixed(2)}
          </span>
          <span style={{ fontSize: 28, color: change.color, display: "flex" }}>
            {change.arrow} {change.text}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 18,
            color: "#9CA3AF",
            marginTop: 8,
            marginBottom: 32,
          }}
        >
          {props.cityCount} cities · week of {formatWeek(props.weekOf)}
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "20px 24px",
              borderRadius: 16,
              backgroundColor: "rgba(34,139,34,0.12)",
              border: "1px solid rgba(34,139,34,0.35)",
            }}
          >
            <span
              style={{
                display: "flex",
                fontSize: 14,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 8,
              }}
            >
              Value trade
            </span>
            <span style={{ display: "flex", fontSize: 28, fontWeight: 600 }}>
              {props.valueLabel}
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: "bold",
                color: "#228B22",
                marginTop: 4,
              }}
            >
              ${props.valueBpi.toFixed(2)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "20px 24px",
              borderRadius: 16,
              backgroundColor: "rgba(220,20,60,0.10)",
              border: "1px solid rgba(220,20,60,0.35)",
            }}
          >
            <span
              style={{
                display: "flex",
                fontSize: 14,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 8,
              }}
            >
              Premium print
            </span>
            <span style={{ display: "flex", fontSize: 28, fontWeight: 600 }}>
              {props.premiumLabel}
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: "bold",
                color: "#DC143C",
                marginTop: 4,
              }}
            >
              ${props.premiumBpi.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
        }}
      >
        <span style={{ display: "flex", fontSize: 16, color: "#6B7280" }}>
          Grid view on the tape
        </span>
        <span style={{ display: "flex", fontSize: 16, color: "#DAA520" }}>
          burgerprice.com/cities
        </span>
      </div>
    </div>
  );
}


function NewsletterCard(props: {
  headline: string;
  weekOf?: string;
}) {
  const weekLabel = props.weekOf
    ? `Week of ${formatWeek(props.weekOf)}`
    : "Weekly Edition";
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
          marginBottom: 16,
        }}
      >
        BPI Weekly
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: "bold",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            maxWidth: 1000,
          }}
        >
          {props.headline}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ display: "flex", fontSize: 16, color: "#6B7280" }}>
          {weekLabel}
        </span>
        <span style={{ display: "flex", fontSize: 16, color: "#DAA520" }}>
          burgerprice.com
        </span>
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
  const newsletterParam = searchParams.get("newsletter");
  const rankingsParam = searchParams.get("rankings");
  const citiesParam = searchParams.get("cities");
  const weekParam = searchParams.get("week");
  const showdownMode = isShowdownRequest({
    showdown: showdownParam,
    type,
    left: leftSlugParam,
    right: rightSlugParam,
  });

  try {
    // Newsletter edition card — before showdown/city/national
    if (newsletterParam === "1" || newsletterParam === "true") {
      const fallbackHeadline =
        "The weekly market report. Burgers priced. Feelings ignored.";
      let headline = fallbackHeadline;
      let weekOf = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
        ? weekParam
        : undefined;

      try {
        if (weekOf) {
          const { getNewsletterByWeek } = await import("@/lib/newsletter-data");
          const edition = await getNewsletterByWeek(weekOf);
          if (edition?.headline) {
            headline = edition.headline;
            weekOf = edition.week_of;
          }
        } else {
          const { getLatestNewsletter } = await import("@/lib/newsletter-data");
          const edition = await getLatestNewsletter();
          if (edition?.headline) {
            headline = edition.headline;
            weekOf = edition.week_of;
          }
        }
      } catch {
        // Keep static fallback — never fail the OG card.
      }

      return new ImageResponse(
        <NewsletterCard headline={headline} weekOf={weekOf} />,
        { width: 1200, height: 630 },
      );
    }


    // All Cities grid card — before showdown/city/national
    if (citiesParam === "1" || citiesParam === "true") {
      const data = await getDashboardData();
      const history = getNationalBpiHistory(data.cities);
      const latest = history[history.length - 1];
      const previous = history.length >= 2 ? history[history.length - 2] : null;
      const ranked = [...data.cities]
        .map((c) => ({
          shortLabel: c.city.name,
          bpi: c.currentSnapshot?.bpi_score ?? null,
        }))
        .filter(
          (c): c is { shortLabel: string; bpi: number } => c.bpi != null,
        )
        .sort((a, b) => b.bpi - a.bpi);

      if (latest && ranked.length > 0) {
        const changePct =
          previous && previous.avg_bpi !== 0
            ? Math.round(
                ((latest.avg_bpi - previous.avg_bpi) / previous.avg_bpi) * 1000,
              ) / 10
            : null;
        const premium = ranked[0];
        const value = ranked[ranked.length - 1];
        try {
          return new ImageResponse(
            (
              <CitiesCard
                weekOf={latest.week_of}
                avgBpi={latest.avg_bpi}
                changePct={changePct}
                cityCount={latest.city_count}
                valueLabel={value.shortLabel}
                valueBpi={value.bpi}
                premiumLabel={premium.shortLabel}
                premiumBpi={premium.bpi}
              />
            ),
            { width: 1200, height: 630 },
          );
        } catch {
          // Cities Satori failure — fall through.
        }
      }
    }

    // Rankings leaderboard card — before showdown/city/national
    if (rankingsParam === "1" || rankingsParam === "true") {
      const data = await getDashboardData();
      const history = getNationalBpiHistory(data.cities);
      const latest = history[history.length - 1];
      const previous = history.length >= 2 ? history[history.length - 2] : null;
      const ranked = [...data.cities]
        .map((c) => ({
          label: `${c.city.name}, ${c.city.state}`,
          shortLabel: c.city.name,
          bpi: c.currentSnapshot?.bpi_score ?? null,
          changePct: c.currentSnapshot?.change_pct ?? null,
        }))
        .filter((c): c is { label: string; shortLabel: string; bpi: number; changePct: number | null } => c.bpi != null)
        .sort((a, b) => b.bpi - a.bpi);

      if (latest && ranked.length > 0) {
        const changePct =
          previous && previous.avg_bpi !== 0
            ? Math.round(
                ((latest.avg_bpi - previous.avg_bpi) / previous.avg_bpi) * 1000,
              ) / 10
            : null;
        const top = ranked.slice(0, 3).map((c, i) => ({
          rank: i + 1,
          label: c.shortLabel,
          bpi: c.bpi,
          changePct: c.changePct,
        }));
        const high = ranked[0];
        const low = ranked[ranked.length - 1];
        try {
          return new ImageResponse(
            (
              <RankingsCard
                weekOf={latest.week_of}
                avgBpi={latest.avg_bpi}
                changePct={changePct}
                cityCount={latest.city_count}
                rows={top}
                highLabel={high.shortLabel}
                highBpi={high.bpi}
                lowLabel={low.shortLabel}
                lowBpi={low.bpi}
              />
            ),
            { width: 1200, height: 630 },
          );
        } catch {
          // Rankings Satori failure — fall through.
        }
      }
    }

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
          try {
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
          } catch {
            // Showdown Satori/render failure — fall through to national/fallback.
          }
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