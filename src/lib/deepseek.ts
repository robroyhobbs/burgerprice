import type {
  RawPrice,
  MarketFactor,
  IndustryNewsItem,
  NewsletterContent,
} from "./types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is required");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text}`);
  }

  const data: DeepSeekResponse = await response.json();
  return data.choices[0]?.message?.content ?? "";
}

/**
 * Research burger prices for a given city using DeepSeek.
 */
export async function researchBurgerPrices(
  city: string,
  state: string,
): Promise<RawPrice[]> {
  const systemPrompt = `You are a burger price researcher. Return ONLY valid JSON.`;

  const userPrompt = `Research current burger prices in ${city}, ${state}.

Find prices from these categories:
- 3-5 fast food chains (McDonald's, Five Guys, Shake Shack, Wendy's, etc.)
- 3-5 casual/diner restaurants (local and chain diners)
- 3-5 premium/gourmet burger spots

For each, provide:
- restaurant: Restaurant name
- burger: Their signature/most popular burger name
- price: Price in USD (number only, no $ sign)
- source: Where you found this price (e.g., "menu", "doordash", "website")
- category: One of "fast_food", "casual", or "premium"
- website: The restaurant's official website URL (e.g., "https://www.mcdonalds.com"). Use null if unknown.

Return as JSON: {"prices": [...]}`;

  const raw = await callDeepSeek(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(raw);
    const prices: RawPrice[] = (parsed.prices || []).map(
      (p: Record<string, unknown>) => ({
        restaurant: String(p.restaurant || "Unknown"),
        burger: String(p.burger || "Burger"),
        price: Number(p.price) || 0,
        source: String(p.source || "research"),
        category: ["fast_food", "casual", "premium"].includes(
          p.category as string,
        )
          ? (p.category as RawPrice["category"])
          : "casual",
        website:
          typeof p.website === "string" && p.website.startsWith("http")
            ? p.website
            : null,
      }),
    );

    // Filter outliers
    return prices.filter((p) => p.price >= 1 && p.price <= 50);
  } catch {
    throw new Error("Failed to parse DeepSeek response as valid price data");
  }
}

/**
 * Generate weekly market report commentary using DeepSeek.
 */
export async function generateMarketReport(data: {
  cities: Array<{
    name: string;
    state: string;
    bpi: number;
    change: number | null;
  }>;
}): Promise<{
  headline: string;
  summary: string;
  factors: MarketFactor[];
}> {
  const systemPrompt = `You are a financial analyst who exclusively covers the burger market. Write with the gravitas of a Wall Street analyst but about burgers. Mix real economic factors with humorous burger market analysis. Return ONLY valid JSON.`;

  const cityLines = data.cities
    .map(
      (c) =>
        `- ${c.name}, ${c.state} BPI: $${c.bpi.toFixed(2)} (${c.change !== null ? `${c.change > 0 ? "+" : ""}${c.change.toFixed(1)}%` : "NEW"})`,
    )
    .join("\n");

  const avgBpi =
    data.cities.reduce((s, c) => s + c.bpi, 0) / data.cities.length;
  const highest = data.cities.reduce((a, b) => (a.bpi > b.bpi ? a : b));
  const lowest = data.cities.reduce((a, b) => (a.bpi < b.bpi ? a : b));

  const userPrompt = `Write a weekly market report for the Burger Price Index, now tracking ${data.cities.length} US cities.

Data this week:
${cityLines}

National average BPI: $${avgBpi.toFixed(2)}
Most expensive: ${highest.name} ($${highest.bpi.toFixed(2)})
Cheapest: ${lowest.name} ($${lowest.bpi.toFixed(2)})

Return JSON with:
{
  "headline": "A punchy financial news headline about burgers (max 80 chars)",
  "summary": "2-3 paragraph market summary mixing real factors (beef prices, inflation, seasonality, local events, regional differences) with humorous burger market analysis. Straight-faced financial reporting tone. Reference specific cities and their rankings.",
  "factors": [
    {"factor": "Factor Name", "impact": "up|down|neutral", "description": "Brief explanation"}
  ]
}

Include exactly 3 market factors.`;

  const raw = await callDeepSeek(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(raw);
    return {
      headline: String(parsed.headline || "Market Update"),
      summary: String(parsed.summary || "Report unavailable."),
      factors: (parsed.factors || []).map((f: Record<string, unknown>) => ({
        factor: String(f.factor || "Unknown"),
        impact: ["up", "down", "neutral"].includes(f.impact as string)
          ? (f.impact as MarketFactor["impact"])
          : "neutral",
        description: String(f.description || ""),
      })),
    };
  } catch {
    throw new Error("Failed to parse DeepSeek market report response");
  }
}

/**
 * Generate a "Burger of the Week" spotlight using DeepSeek.
 */
export async function generateSpotlight(
  city: string,
  state: string,
  prices: RawPrice[],
): Promise<{
  restaurantName: string;
  burgerName: string;
  price: number;
  description: string;
}> {
  const systemPrompt = `You are a burger critic and market analyst. Return ONLY valid JSON.`;

  const priceList = prices
    .map((p) => `${p.restaurant}: ${p.burger} ($${p.price})`)
    .join("\n");

  const userPrompt = `From these burger options in ${city}, ${state}, pick the "Burger of the Week":

${priceList}

Pick the most interesting, best value, or most notable burger. Return JSON:
{
  "restaurantName": "Name",
  "burgerName": "Burger Name",
  "price": 12.99,
  "description": "2-3 sentence description of why this is the pick of the week. Mix food critic flair with financial analyst language."
}`;

  const raw = await callDeepSeek(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(raw);
    return {
      restaurantName: String(parsed.restaurantName || "Unknown"),
      burgerName: String(parsed.burgerName || "Burger"),
      price: Number(parsed.price) || 0,
      description: String(parsed.description || "This week's top pick."),
    };
  } catch {
    throw new Error("Failed to parse DeepSeek spotlight response");
  }
}

/**
 * Generate industry news stories related to burger prices and the food industry.
 */
export async function generateIndustryNews(data: {
  cities: Array<{ name: string; state: string; bpi: number }>;
  weekOf: string;
}): Promise<Omit<IndustryNewsItem, "id" | "created_at">[]> {
  const systemPrompt = `You are a financial news wire reporter covering the burger and food service industry. Write with the authority and style of Bloomberg or Reuters, but specifically about burgers, beef, and fast food. Mix real-world factors (USDA beef prices, supply chain, minimum wage, weather, seasonal demand, restaurant earnings) with the fun premise. Return ONLY valid JSON.`;

  const cityLines = data.cities
    .map((c) => `- ${c.name}, ${c.state} BPI: $${c.bpi.toFixed(2)}`)
    .join("\n");

  const userPrompt = `Generate 5 industry news briefs for the Burger Price Index newsletter for the week of ${data.weekOf}.

Current BPI data across ${data.cities.length} cities:
${cityLines}

Write stories across these categories (one each):
1. "supply-chain" - Something about beef/ingredient prices, supply, or logistics
2. "regulation" - Minimum wage, food safety, restaurant regulations
3. "market" - Restaurant earnings, closures, openings, industry trends
4. "consumer" - Consumer behavior, trends, preferences, seasonal patterns
5. "wild-card" - An unexpected or humorous angle that's still plausible

Each story should:
- Have a punchy financial-news-style headline (title)
- Be 2-3 sentences of summary in wire-service style
- Reference real companies, agencies, or trends when possible
- Indicate whether the story is bullish (prices likely to rise), bearish (prices likely to fall), or neutral for burger prices

Return JSON:
{
  "stories": [
    {
      "title": "Headline here",
      "summary": "2-3 sentence summary.",
      "category": "supply-chain|regulation|market|consumer|wild-card",
      "source": "Plausible source attribution (e.g., 'USDA Weekly Report', 'National Restaurant Association', 'Reuters')",
      "impact": "bullish|bearish|neutral"
    }
  ]
}`;

  const raw = await callDeepSeek(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(raw);
    return (parsed.stories || []).map((s: Record<string, unknown>) => ({
      week_of: data.weekOf,
      title: String(s.title || "Industry Update"),
      summary: String(s.summary || ""),
      category: String(s.category || "market"),
      source: s.source ? String(s.source) : null,
      impact: (["bullish", "bearish", "neutral"].includes(s.impact as string)
        ? s.impact
        : "neutral") as IndustryNewsItem["impact"],
    }));
  } catch {
    throw new Error("Failed to parse DeepSeek industry news response");
  }
}

/**
 * Generate a full weekly newsletter edition using DeepSeek.
 * Returns structured content with all 6 sections in mockumentary financial style.
 */
export async function generateNewsletter(data: {
  cities: Array<{
    name: string;
    state: string;
    bpi: number;
    change: number | null;
    cheapest: { restaurant: string; price: number };
    mostExpensive: { restaurant: string; price: number };
  }>;
  weekOf: string;
  spotlightCity?: {
    name: string;
    burgerName: string;
    restaurant: string;
    price: number;
  };
}): Promise<NewsletterContent> {
  const systemPrompt = `You are a seasoned financial analyst who covers the burger market with complete sincerity. You write for the Burger Price Index (BPI) weekly newsletter — imagine Bloomberg Terminal meets financial journalism, but about burgers. Your tone is deadpan serious. You never break character. The humor comes from treating burgers with the gravitas of equities and commodities. Use financial jargon naturally: "rallied", "corrected", "support levels", "bearish divergence", "sector rotation", etc. Return ONLY valid JSON.`;

  const sorted = [...data.cities].sort((a, b) => b.bpi - a.bpi);
  const movers = [...data.cities]
    .filter((c) => c.change !== null)
    .sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!))
    .slice(0, 5);

  const avgBpi =
    data.cities.reduce((s, c) => s + c.bpi, 0) / data.cities.length;

  const nationalCheapest = data.cities.reduce((a, b) =>
    a.cheapest.price < b.cheapest.price ? a : b,
  );
  const nationalExpensive = data.cities.reduce((a, b) =>
    a.mostExpensive.price > b.mostExpensive.price ? a : b,
  );

  const cityLines = sorted
    .map(
      (c) =>
        `- ${c.name}, ${c.state}: BPI $${c.bpi.toFixed(2)} (${c.change !== null ? `${c.change > 0 ? "+" : ""}${c.change.toFixed(1)}%` : "NEW"}) | Low: $${c.cheapest.price.toFixed(2)} (${c.cheapest.restaurant}) | High: $${c.mostExpensive.price.toFixed(2)} (${c.mostExpensive.restaurant})`,
    )
    .join("\n");

  const moverLines = movers
    .map(
      (c) =>
        `${c.name}: ${c.change! > 0 ? "+" : ""}${c.change!.toFixed(1)}% ($${c.bpi.toFixed(2)})`,
    )
    .join(", ");

  const spotlightInfo = data.spotlightCity
    ? `\nSpotlight suggestion: ${data.spotlightCity.name} — ${data.spotlightCity.restaurant}'s "${data.spotlightCity.burgerName}" at $${data.spotlightCity.price.toFixed(2)}`
    : "";

  const userPrompt = `Write the BPI Weekly Newsletter for the week of ${data.weekOf}.

DATA:
${cityLines}

National Average BPI: $${avgBpi.toFixed(2)}
Top movers: ${moverLines}
National cheapest: $${nationalCheapest.cheapest.price.toFixed(2)} at ${nationalCheapest.cheapest.restaurant} (${nationalCheapest.name})
National most expensive: $${nationalExpensive.mostExpensive.price.toFixed(2)} at ${nationalExpensive.mostExpensive.restaurant} (${nationalExpensive.name})${spotlightInfo}

Return JSON with this EXACT structure:
{
  "headline": "Newsletter edition headline — punchy financial news style, max 100 chars",
  "marketOverview": "2-3 paragraphs. Open with the big picture: national average movement, overall market direction. Then drill into regional trends. Use financial language seriously. Reference specific cities and prices.",
  "theTape": [
    {"city": "City Name", "direction": "up or down", "changePct": 2.5, "commentary": "One sentence of analyst commentary on this move"}
  ],
  "citySpotlight": {
    "city": "Pick the most interesting city this week",
    "narrative": "2-3 paragraphs deep dive on this city's burger market. Discuss price levels, notable restaurants, market positioning vs national average. Write like a research analyst covering a specific equity."
  },
  "burgerOfTheWeek": {
    "restaurant": "Restaurant name",
    "burger": "Burger name",
    "city": "City",
    "price": 12.99,
    "review": "2-3 sentences. Write like a wine critic reviewing a vintage but about a burger. Note the price-to-quality ratio, market positioning, and whether it represents alpha."
  },
  "theSpread": {
    "cheapest": {"restaurant": "${nationalCheapest.cheapest.restaurant}", "city": "${nationalCheapest.name}", "price": ${nationalCheapest.cheapest.price}},
    "mostExpensive": {"restaurant": "${nationalExpensive.mostExpensive.restaurant}", "city": "${nationalExpensive.name}", "price": ${nationalExpensive.mostExpensive.price}},
    "commentary": "2-3 sentences analyzing the spread between cheapest and most expensive. Discuss what this tells us about the national burger market, purchasing power, and regional economics."
  },
  "analystsCorner": {
    "title": "A column title like 'On Bun Stability and Consumer Confidence'",
    "essay": "2-3 paragraphs of tongue-in-cheek market analysis. Pick a theme (seasonality, regional convergence, fast food vs premium divergence, etc.) and analyze it with complete seriousness. Reference data from the cities. End with a market outlook."
  }
}

Include 3-5 movers in theTape. All commentary should be deadpan financial analysis — never acknowledge the absurdity.`;

  const raw = await callDeepSeek(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(raw);

    // Validate required sections exist
    const content: NewsletterContent = {
      headline: String(parsed.headline || "BPI Weekly Market Report"),
      marketOverview: String(
        parsed.marketOverview || "Market data under review.",
      ),
      theTape: Array.isArray(parsed.theTape)
        ? parsed.theTape.map((m: Record<string, unknown>) => ({
            city: String(m.city || "Unknown"),
            direction:
              m.direction === "down" ? ("down" as const) : ("up" as const),
            changePct: Number(m.changePct) || 0,
            commentary: String(m.commentary || ""),
          }))
        : [],
      citySpotlight: {
        city: String(parsed.citySpotlight?.city || sorted[0]?.name || ""),
        narrative: String(
          parsed.citySpotlight?.narrative || "Analysis pending.",
        ),
      },
      burgerOfTheWeek: {
        restaurant: String(parsed.burgerOfTheWeek?.restaurant || "TBD"),
        burger: String(parsed.burgerOfTheWeek?.burger || "House Burger"),
        city: String(parsed.burgerOfTheWeek?.city || ""),
        price: Number(parsed.burgerOfTheWeek?.price) || 0,
        review: String(parsed.burgerOfTheWeek?.review || "Under review."),
      },
      theSpread: {
        cheapest: {
          restaurant: String(
            parsed.theSpread?.cheapest?.restaurant ||
              nationalCheapest.cheapest.restaurant,
          ),
          city: String(
            parsed.theSpread?.cheapest?.city || nationalCheapest.name,
          ),
          price:
            Number(parsed.theSpread?.cheapest?.price) ||
            nationalCheapest.cheapest.price,
        },
        mostExpensive: {
          restaurant: String(
            parsed.theSpread?.mostExpensive?.restaurant ||
              nationalExpensive.mostExpensive.restaurant,
          ),
          city: String(
            parsed.theSpread?.mostExpensive?.city || nationalExpensive.name,
          ),
          price:
            Number(parsed.theSpread?.mostExpensive?.price) ||
            nationalExpensive.mostExpensive.price,
        },
        commentary: String(
          parsed.theSpread?.commentary || "Spread analysis pending.",
        ),
      },
      analystsCorner: {
        title: String(
          parsed.analystsCorner?.title || "Weekly Market Commentary",
        ),
        essay: String(parsed.analystsCorner?.essay || "Commentary pending."),
      },
    };

    return content;
  } catch {
    throw new Error("Failed to parse DeepSeek newsletter response");
  }
}
