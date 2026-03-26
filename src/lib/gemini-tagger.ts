import { serverConfig } from "@/lib/config";

export interface GeminiTagResult {
  tags: string[];
  product: string | null;
  description: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function buildTaggingPrompt(): string {
  const context = serverConfig.geminiPromptContext.trim();

  return `${serverConfig.geminiPromptPrefix.trim()}
${context ? `\nContext: ${context}\n` : ""}
Analyze this image and return a JSON object with the following fields:
- "tags": array of descriptive tags (10-20 tags), including:
  - Product name if identifiable
  - Visual type: one of ["product-shot", "lifestyle", "flat-lay", "detail", "packaging", "team", "user-generated", "logo", "illustration", "banner"]
  - Background: one of ["white", "light", "dark", "colorful", "outdoor", "studio", "lifestyle-setting"]
  - Orientation: one of ["portrait", "landscape", "square"]
  - Colors: 2-3 dominant colors
  - Mood: 1-2 mood tags (for example "minimal", "warm", "energetic", "aspirational")
  - Use case hints: relevant channels (for example "email", "social", "ads", "web")
- "product": the specific product name if clearly identifiable, otherwise null
- "description": 1-2 sentence description of the image for search

Return ONLY valid JSON, no markdown, no explanation.`;
}

function extractResponseText(payload: GeminiGenerateResponse): string | null {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("").trim();
  return text || null;
}

function cleanGeminiJson(text: string): string {
  return text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
}

export async function tagImageWithGemini(
  imageUrl: string,
  mimeType = "image/jpeg"
): Promise<GeminiTagResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[gemini-tagger] GEMINI_API_KEY not set, skipping auto-tagging");
    return null;
  }

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("[gemini-tagger] Failed to fetch image:", imageUrl);
      return null;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${serverConfig.geminiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: buildTaggingPrompt() },
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error("[gemini-tagger] Gemini request failed:", geminiResponse.status);
      return null;
    }

    const payload = (await geminiResponse.json()) as GeminiGenerateResponse;
    const text = extractResponseText(payload);

    if (!text) {
      return null;
    }

    const parsed = JSON.parse(cleanGeminiJson(text)) as Partial<GeminiTagResult>;

    return {
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      product: typeof parsed.product === "string" ? parsed.product : null,
      description:
        typeof parsed.description === "string" ? parsed.description : "",
    };
  } catch (error) {
    console.error("[gemini-tagger] Error tagging image:", error);
    return null;
  }
}
