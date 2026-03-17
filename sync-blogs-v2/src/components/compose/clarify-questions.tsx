"use client";

import { useState } from "react";

interface Question {
  question: string;
  options: string[];
}

interface ClarifyQuestionsProps {
  questions: Question[];
  initialAnswers: Record<string, string[]>;
  onSubmit: (answers: Record<string, string[]>) => void;
  onSkip: () => void;
  onBack: () => void;
  isGenerating?: boolean;
  generateLabel?: string;
  elapsedLabel?: string | null;
}

export function ClarifyQuestions({
  questions,
  initialAnswers,
  onSubmit,
  onSkip,
  onBack,
  isGenerating = false,
  generateLabel = "Generate with these answers",
  elapsedLabel,
}: ClarifyQuestionsProps) {
  const [answers, setAnswers] =
    useState<Record<string, string[]>>(initialAnswers);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const toggleOption = (questionIdx: number, option: string) => {
    const key = String(questionIdx);
    const current = answers[key] ?? [];
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setAnswers({ ...answers, [key]: updated });
  };

  const addCustom = (questionIdx: number) => {
    const key = String(questionIdx);
    const value = customInputs[key]?.trim();
    if (!value) return;
    const current = answers[key] ?? [];
    if (!current.includes(value)) {
      setAnswers({ ...answers, [key]: [...current, value] });
    }
    setCustomInputs({ ...customInputs, [key]: "" });
  };

  return (
    <div className="clarify-container">
      <div className="clarify-header">
        <span className="clarify-eyebrow">{"\u2726"} Quick questions</span>
        <h2>Before I write this up...</h2>
        <p>A few quick questions to make sure the draft matches what you have in mind.</p>
      </div>

      <div className="clarify-questions">
        {questions.map((q, idx) => (
          <div key={idx} className="clarify-question-card" style={{ animationDelay: `${idx * 80}ms` }}>
            <h3>{q.question}</h3>
            <div className="clarify-options">
              {q.options.map((opt) => {
                const selected = (answers[String(idx)] ?? []).includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleOption(idx, opt)}
                    className={`clarify-option${selected ? " selected" : ""}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="clarify-custom-wrap">
              <input
                type="text"
                placeholder="Or type your own..."
                value={customInputs[String(idx)] ?? ""}
                onChange={(e) =>
                  setCustomInputs({
                    ...customInputs,
                    [String(idx)]: e.target.value,
                  })
                }
                onKeyDown={(e) => e.key === "Enter" && addCustom(idx)}
                className="clarify-custom-input"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="clarify-footer">
        <button onClick={onSkip} className="btn-ghost-sm" disabled={isGenerating}>
          Skip — just generate
        </button>
        <button
          onClick={() => onSubmit(answers)}
          className={`btn-primary-action${isGenerating ? " is-generating" : ""}`}
          disabled={isGenerating}
        >
          {isGenerating && <span className="btn-spinner" />}
          <span className="btn-label">{generateLabel}</span>
          {elapsedLabel && (
            <span className="btn-progress">{elapsedLabel}</span>
          )}
        </button>
      </div>
    </div>
  );
}
