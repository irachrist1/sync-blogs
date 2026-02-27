export type PriorityBucket = "now" | "soon" | "optional";

export type PersonaName =
  | "Editor"
  | "Skeptic"
  | "Empath"
  | "Philosopher"
  | "Coach";

export interface PersonaIssue {
  priority: PriorityBucket;
  issue: string;
  suggestion: string;
  evidence?: string;
  confidence: number;
}

export interface PersonaOutput {
  persona: PersonaName;
  strengths: string[];
  issues: PersonaIssue[];
  questions: string[];
}

export interface RankedIssue extends PersonaIssue {
  persona: PersonaName;
  score: number;
}
