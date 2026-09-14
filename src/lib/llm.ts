/**
 * Minimal LLM transport for cron research/generation.
 *
 * Provider selection (prod-first):
 * 1. Gemini when GEMINI_MODEL is set AND Vertex (GOOGLE_CLOUD_PROJECT + ADC
 *    on Cloud Run) or a Gemini/Google API key is available.
 * 2. DeepSeek when DEEPSEEK_API_KEY is set.
 *
 * Prod deploy already sets GEMINI_MODEL, GOOGLE_CLOUD_PROJECT, and
 * GOOGLE_CLOUD_LOCATION — no DEEPSEEK_API_KEY secret. Vertex calls use the
 * Cloud Run runtime service account via the metadata server (ADC).
 */

export type LlmProvider = "gemini" | "deepseek";

export function resolveLlmProvider(): LlmProvider {
  const geminiModel = process.env.GEMINI_MODEL?.trim();
  if (geminiModel) {
    const hasVertex = Boolean(process.env.GOOGLE_CLOUD_PROJECT?.trim());
    const hasApiKey = Boolean(
      process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim(),
    );
    if (hasVertex || hasApiKey) return "gemini";
  }
  if (process.env.DEEPSEEK_API_KEY?.trim()) return "deepseek";

  throw new Error(
    "No LLM configured. Set GEMINI_MODEL with GOOGLE_CLOUD_PROJECT (Vertex/ADC) " +
      "or GEMINI_API_KEY/GOOGLE_API_KEY, or set DEEPSEEK_API_KEY.",
  );
}

export async function callJsonLlm(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const provider = resolveLlmProvider();
  if (provider === "gemini") return callGeminiJson(systemPrompt, userPrompt);
  return callDeepSeekJson(systemPrompt, userPrompt);
}

async function callDeepSeekJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is required");
  }

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
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

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGeminiJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const model = process.env.GEMINI_MODEL!.trim();
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const location =
    process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1";

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  };

  let url: string;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (project) {
    // Vertex AI on Cloud Run: ADC via metadata server (no API key secret).
    const token = await getGcpAccessToken();
    headers.Authorization = `Bearer ${token}`;
    url =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
      `/locations/${location}/publishers/google/models/${model}:generateContent`;
  } else if (apiKey) {
    url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;
  } else {
    throw new Error(
      "Gemini configured without GOOGLE_CLOUD_PROJECT or GEMINI_API_KEY/GOOGLE_API_KEY",
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  return text ?? "";
}

/** Cloud Run / GCE metadata server access token (ADC). */
async function getGcpAccessToken(): Promise<string> {
  const res = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to fetch GCP ADC token from metadata server (${res.status}): ${text}`,
    );
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Metadata server returned no access_token");
  }
  return data.access_token;
}
