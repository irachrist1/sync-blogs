export type ComposeMode = "argument" | "narrative" | "brief";

export interface ComposeInput {
  roughInput: string;
  mode?: ComposeMode;
  includeStyleProfile?: boolean;
}

export interface DraftOption {
  mode: ComposeMode;
  titleSuggestion: string;
  draft: string;
}

function splitThoughts(input: string): string[] {
  return input
    .split(/\n|\. /g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function composeDraftOptions(input: ComposeInput): DraftOption[] {
  const points = splitThoughts(input.roughInput);
  const first = points[0] ?? "The core idea";
  const second = points[1] ?? "Supporting point";
  const third = points[2] ?? "Practical takeaway";

  const options: DraftOption[] = [
    {
      mode: "argument",
      titleSuggestion: `Why ${first.toLowerCase()} matters`,
      draft: `Thesis: ${first}.\n\nReason 1: ${second}.\n\nReason 2: ${third}.\n\nConclusion: The key takeaway is to act with clarity and specificity.`,
    },
    {
      mode: "narrative",
      titleSuggestion: `What I learned about ${first.toLowerCase()}`,
      draft: `I started with a simple question: ${first}.\n\nAs I explored it, one pattern stood out: ${second}.\n\nThe turning point was this: ${third}.\n\nWhat changed for me is not just the answer, but how I now approach the problem.`,
    },
    {
      mode: "brief",
      titleSuggestion: `${first}: a practical brief`,
      draft: `Summary: ${first}.\n\nKey points:\n- ${second}\n- ${third}\n\nNext step: choose one concrete action and execute it this week.`,
    },
  ];

  if (input.mode) {
    return options.filter((option) => option.mode === input.mode);
  }

  return options;
}
