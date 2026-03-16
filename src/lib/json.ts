export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.trim();

  if (!cleaned) {
    throw new Error("Model returned an empty response.");
  }

  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i) ?? cleaned.match(/```\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? cleaned;

  return JSON.parse(candidate) as T;
}
