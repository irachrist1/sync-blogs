export const PERSONAS = [
  {
    id: "editor",
    name: "The Editor",
    role: "Clarity & structure",
    tone: "Direct, precise feedback on writing mechanics",
    color: "#2d6a4f",
  },
  {
    id: "skeptic",
    name: "The Skeptic",
    role: "Logic & evidence",
    tone: "Challenges claims and asks for proof",
    color: "#b8860b",
  },
  {
    id: "empath",
    name: "The Empath",
    role: "Reader connection",
    tone: "Focuses on emotional resonance and relatability",
    color: "#c2556e",
  },
  {
    id: "philosopher",
    name: "The Philosopher",
    role: "Depth & meaning",
    tone: "Explores deeper implications and nuance",
    color: "#5b5ea6",
  },
  {
    id: "coach",
    name: "The Coach",
    role: "Growth & encouragement",
    tone: "Supportive guidance with actionable next steps",
    color: "#2e8b57",
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
