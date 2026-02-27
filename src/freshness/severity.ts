export type DriftImpact = "low" | "medium" | "high";

export interface SeverityInput {
  confidence: number;
  claimType: "version" | "date" | "stat" | "policy" | "price" | "other";
  trafficTier: "low" | "medium" | "high";
}

export function classifyDriftSeverity(input: SeverityInput): DriftImpact {
  const confidence = Math.max(0, Math.min(1, input.confidence));

  let score = confidence * 0.6;

  if (input.claimType === "version" || input.claimType === "policy") score += 0.2;
  if (input.claimType === "stat" || input.claimType === "price") score += 0.15;
  if (input.trafficTier === "high") score += 0.15;
  if (input.trafficTier === "medium") score += 0.08;

  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}
