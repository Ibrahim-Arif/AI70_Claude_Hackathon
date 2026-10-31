import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const AI_TIMEOUT_MS = 6000;

export function hasKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic({ maxRetries: 0, timeout: AI_TIMEOUT_MS });
  return client;
}

/** One short Claude call. Throws on any API error, timeout or refusal. */
export async function complete(system: string, user: string, maxTokens = 800): Promise<string> {
  const msg = await getClient().messages.create(
    {
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low" },
    },
    { timeout: AI_TIMEOUT_MS, maxRetries: 0 },
  );
  if (msg.stop_reason === "refusal") throw new Error("refusal");
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("empty");
  return text;
}

/** Pull the first JSON object out of a model reply. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(text.slice(start, end + 1));
}
