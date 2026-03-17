export const PERSONAS = [
  {
    id: "craft",
    name: "Craft",
    role: "Structure, clarity & readability",
    color: "#2d6a4f",
  },
  {
    id: "truth",
    name: "Truth",
    role: "Logic, claims & audience fit",
    color: "#b8860b",
  },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];

export const REVIEW_INTENSITIES = [
  { id: "gentle", label: "Gentle", description: "Light suggestions only" },
  {
    id: "balanced",
    label: "Balanced",
    description: "Mix of praise and critique",
  },
  {
    id: "rigorous",
    label: "Rigorous",
    description: "Thorough, no-holds-barred",
  },
] as const;

export const POST_STATUSES = ["draft", "published", "archived"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const PRIORITY_LABELS = {
  now: "Fix Now",
  soon: "Fix Soon",
  optional: "Optional",
} as const;

export const SEVERITY_COLORS = {
  low: "text-accent-app",
  medium: "text-warn",
  high: "text-danger",
} as const;
