import type { RawPrice, MarketFactor, IndustryNewsItem } from "./types";

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
