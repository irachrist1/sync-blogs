import dotenv from "dotenv";

dotenv.config();

export function getAnthropicConfig(): { apiKey: string | null; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";

  return { apiKey, model };
}

export function requireAnthropicConfig(): { apiKey: string; model: string } {
  const config = getAnthropicConfig();
  if (!config.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing. Add it to .env before using AI features.");
  }

  return {
    apiKey: config.apiKey,
    model: config.model,
  };
}
