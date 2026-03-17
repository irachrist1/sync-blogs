export interface OnboardingOption {
  value: string;
  label: string;
  desc?: string;
}

export interface OnboardingStep {
  key: string;
  type: "text" | "multi";
  question: string;
  subtitle?: string;
  placeholder?: string;
  options?: OnboardingOption[];
}

export function getOnboardingQuestions(
  answers: Record<string, string | string[]>
): OnboardingStep[] {
  const name = (answers.name as string) || "there";
  const destinations = answers.destination || [];
  const destination = Array.isArray(destinations)
    ? destinations
    : [destinations];
  const tones = answers.tone || [];
  const tone = Array.isArray(tones) ? tones : [tones];

  return [
    // Step 0: Name
    {
      key: "name",
      type: "text",
      question:
        "Hey! Before we start writing together, let me learn how you write.",
      subtitle: "What should I call you?",
      placeholder: "Your first name",
    },
    // Step 1: Destination
    {
      key: "destination",
      type: "multi",
      question: `Nice to meet you, ${name}. Where does your writing usually end up?`,
      subtitle:
        "Pick all that apply — most writers publish in more than one place.",
      options: [
        {
          value: "personal-blog",
          label: "Personal blog",
          desc: "Long-form, your own space",
        },
        {
          value: "newsletter",
          label: "Newsletter",
          desc: "Regular sends to subscribers",
        },
        {
          value: "linkedin",
          label: "LinkedIn",
          desc: "Professional audience, feed-friendly",
        },
        {
          value: "twitter",
          label: "Twitter / X",
          desc: "Short-form, punchy threads",
        },
        {
          value: "medium",
          label: "Medium",
          desc: "Public essays and explainers",
        },
        {
          value: "internal",
          label: "Internal docs",
          desc: "Team memos, RFCs, updates",
        },
        {
          value: "just-me",
          label: "Just for me",
          desc: "Thinking on paper, no audience",
        },
      ],
    },
    // Step 2: Tone (adaptive based on destination)
    {
      key: "tone",
      type: "multi",
      question: `How would people describe your writing voice, ${name}?`,
      subtitle:
        "Pick all that feel like you — most writers blend a few of these.",
      options:
        destination.includes("linkedin") && destination.length === 1
          ? [
              {
                value: "thought-leader",
                label: "Thought-leader but human",
                desc: "Authoritative without being stiff",
              },
              {
                value: "professional-warm",
                label: "Professional but warm",
                desc: "Polished, approachable",
              },
              {
                value: "direct",
                label: "Direct and no-BS",
                desc: "Say it straight, skip the fluff",
              },
              {
                value: "analytical",
                label: "Analytical and measured",
                desc: "Data-driven, careful claims",
              },
            ]
          : destination.includes("twitter") && destination.length === 1
            ? [
                {
                  value: "witty",
                  label: "Witty and sharp",
                  desc: "Quick takes, clever phrasing",
                },
                {
                  value: "direct",
                  label: "Direct and punchy",
                  desc: "No wasted words",
                },
                {
                  value: "conversational",
                  label: "Conversational",
                  desc: "Like talking to a friend",
                },
                {
                  value: "provocative",
                  label: "Provocative",
                  desc: "Hot takes, strong opinions",
                },
              ]
            : [
                {
                  value: "conversational",
                  label: "Conversational & casual",
                  desc: "Like talking to a smart friend",
                },
                {
                  value: "opinionated",
                  label: "Opinionated & direct",
                  desc: "Takes a stance, doesn't hedge",
                },
                {
                  value: "formal",
                  label: "Formal & professional",
                  desc: "Polished, measured, authoritative",
                },
                {
                  value: "analytical",
                  label: "Analytical & measured",
                  desc: "Evidence-first, careful reasoning",
                },
                {
                  value: "playful",
                  label: "Playful & humorous",
                  desc: "Wit, personality, lightness",
                },
              ],
    },
    // Step 3: Sentence style
    {
      key: "sentenceStyle",
      type: "multi",
      question: "What kind of sentences feel most like you?",
      subtitle:
        "Pick all that apply — your style might shift depending on the piece.",
      options: [
        {
          value: "short",
          label: "Short and punchy.",
          desc: "Like this. Gets to the point.",
        },
        {
          value: "long",
          label: "Longer sentences that breathe",
          desc: "Ideas that build on each other naturally, with room to develop.",
        },
        {
          value: "mixed",
          label: "A mix of both",
          desc: "Short for impact. Longer when the idea needs space.",
        },
      ],
    },
    // Step 4: Structure
    {
      key: "structure",
      type: "multi",
      question: "How do you like to organize your pieces?",
      subtitle:
        tone.includes("analytical") || tone.includes("formal")
          ? "Analytical writers often prefer clear sections — but pick all that fit."
          : "Pick all that apply. Most writers mix these depending on the piece.",
      options: [
        {
          value: "headers",
          label: "Headers and sections",
          desc: "Clear signposts, scannable",
        },
        {
          value: "flowing",
          label: "Flowing prose",
          desc: "One thought leading to the next",
        },
        {
          value: "bullets",
          label: "Bullet points and lists",
          desc: "Structured, easy to skim",
        },
        {
          value: "narrative",
          label: "Essay-style narrative",
          desc: "Story arc, beginning to end",
        },
      ],
    },
    // Step 5: Length
    {
      key: "lengthPreference",
      type: "multi",
      question: "How long are your typical pieces?",
      subtitle: destination.includes("twitter")
        ? "Even for threads — pick all the lengths you work with."
        : "Pick all that apply. Most writers work at different lengths.",
      options: [
        { value: "short", label: "Quick takes", desc: "300–600 words" },
        { value: "medium", label: "Standard", desc: "600–1,200 words" },
        { value: "long", label: "Long-form", desc: "1,200–2,500 words" },
        { value: "deep", label: "Deep dives", desc: "2,500+ words" },
      ],
    },
    // Step 6: Perspective
    {
      key: "perspective",
      type: "multi",
      question: `Do you write as "I" or keep it third person?`,
      subtitle:
        "Pick all that apply — many writers switch depending on context.",
      options: [
        {
          value: "first",
          label: "First person",
          desc: "I, we — personal and direct",
        },
        {
          value: "third",
          label: "Third person",
          desc: "Objective, observational",
        },
        {
          value: "depends",
          label: "Depends on the piece",
          desc: "I switch based on context",
        },
      ],
    },
    // Step 7: Personal stories
    {
      key: "personalStories",
      type: "multi",
      question: "Do you weave personal experiences into your writing?",
      subtitle:
        tone.includes("analytical") || tone.includes("formal")
          ? "Even analytical writers sometimes open with a story. Pick all that fit."
          : "Pick all that describe your approach — it might vary by piece.",
      options: [
        {
          value: "often",
          label: "Yes, often",
          desc: "It's how I connect with readers",
        },
        {
          value: "sometimes",
          label: "Sometimes",
          desc: "When it serves the point",
        },
        {
          value: "rarely",
          label: "Rarely",
          desc: "I prefer ideas over anecdotes",
        },
      ],
    },
    // Step 8: Opening style
    {
      key: "hookPreference",
      type: "multi",
      question: "How do you like to open a piece?",
      subtitle:
        "Pick all that you use — most writers rotate between a few of these.",
      options: [
        {
          value: "bold-claim",
          label: "Bold claim or hot take",
          desc: "Grab attention immediately",
        },
        {
          value: "story",
          label: "A personal story",
          desc: "Draw them in with narrative",
        },
        {
          value: "question",
          label: "A question to the reader",
          desc: "Make them think first",
        },
        {
          value: "fact",
          label: "A surprising fact or stat",
          desc: "Lead with evidence",
        },
        {
          value: "straight-in",
          label: "Jump straight in",
          desc: "No preamble, just start",
        },
      ],
    },
    // Step 9: Formatting habits you USE
    {
      key: "formattingHabits",
      type: "multi",
      question: `Almost done, ${name}. Which of these feel like you?`,
      subtitle:
        "Pick all that apply. These are the little things that make writing feel like yours.",
      options: [
        { value: "em-dashes", label: "Em-dashes (—)" },
        { value: "oxford-comma", label: "Oxford comma" },
        { value: "parentheticals", label: "Parenthetical asides (like this)" },
        { value: "references", label: "References to other thinkers" },
        { value: "open-questions", label: "Ends with open questions" },
        { value: "italics", label: "Italics for emphasis" },
        { value: "bold-terms", label: "Bold for key terms" },
        { value: "short-paragraphs", label: "Short paragraphs" },
        { value: "contractions", label: "Contractions (don't, can't)" },
        { value: "minimal-caps", label: "Minimal capitalization" },
        { value: "lowercase-titles", label: "Lowercase titles and headings" },
        { value: "ellipses", label: "Ellipses (…)" },
        { value: "exclamations", label: "Exclamation marks!" },
        { value: "rhetorical-questions", label: "Rhetorical questions" },
        {
          value: "sentence-fragments",
          label: "Sentence fragments. On purpose.",
        },
      ],
    },
    // Step 10: Formatting habits you AVOID
    {
      key: "formattingAvoid",
      type: "multi",
      question: `Last one, ${name}. Which of these do you avoid?`,
      subtitle:
        "Pick anything that makes you cringe when you see it in writing.",
      options: [
        { value: "em-dashes", label: "Em-dashes (—)" },
        { value: "oxford-comma", label: "Oxford comma" },
        {
          value: "excessive-caps",
          label: "Capitalizing Every Word In Titles",
        },
        { value: "exclamations", label: "Exclamation marks!" },
        { value: "ellipses", label: "Ellipses (…)" },
        { value: "bold-terms", label: "Bold for emphasis" },
        { value: "parentheticals", label: "Parenthetical asides" },
        { value: "passive-voice", label: "Passive voice" },
        {
          value: "hedging",
          label: "Hedging (maybe, perhaps, arguably)",
        },
        {
          value: "filler-words",
          label: "Filler words (very, really, just)",
        },
        { value: "cliches", label: "Clichés and buzzwords" },
        { value: "bullet-lists", label: "Bullet point lists" },
        {
          value: "long-intros",
          label: "Long introductions before the point",
        },
        {
          value: "formal-transitions",
          label: "Formal transitions (furthermore, moreover)",
        },
        { value: "smiley-faces", label: "Emojis and smiley faces" },
      ],
    },
  ];
}
