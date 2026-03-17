"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  getOnboardingQuestions,
} from "@/lib/onboarding-questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

export function OnboardingWizard() {
  const { user } = useCurrentUser();
  const router = useRouter();

  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    {}
  );

  const questions = getOnboardingQuestions(answers);
  const total = questions.length;
  const current = questions[step];

  const handleTextChange = (value: string) => {
    setAnswers({ ...answers, [current.key]: value });
  };

  const handleToggleOption = (value: string) => {
    const key = current.key;
    const existing = (answers[key] as string[]) || [];
    const updated = existing.includes(value)
      ? existing.filter((v) => v !== value)
      : [...existing, value];
    setAnswers({ ...answers, [key]: updated });
  };

  const canProceed = () => {
    const val = answers[current.key];
    if (current.type === "text") return typeof val === "string" && val.trim().length > 0;
    if (current.type === "multi") return Array.isArray(val) && val.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < total - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    if (!user) return;

    const profile = {
      destination: asArray(answers.destination),
      tone: asArray(answers.tone),
      sentenceStyle: asArray(answers.sentenceStyle),
      structure: asArray(answers.structure),
      lengthPreference: asArray(answers.lengthPreference),
      perspective: asArray(answers.perspective),
      personalStories: asArray(answers.personalStories),
      hookPreference: asArray(answers.hookPreference),
      formattingHabits: asArray(answers.formattingHabits),
    };

    await completeOnboarding({ writingProfile: profile });
    router.push("/app");
  };

  const isLast = step === total - 1;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 bg-bg/80 backdrop-blur-sm border-b border-line px-6 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Progress value={((step + 1) / total) * 100} className="flex-1" />
          <span className="text-xs text-muted-app whitespace-nowrap">
            {step + 1} of {total}
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          {/* Question */}
          <h2 className="text-xl font-semibold text-ink mb-2">
            {current.question}
          </h2>
          {current.subtitle && (
            <p className="text-sm text-muted-app mb-6">{current.subtitle}</p>
          )}

          {/* Text input */}
          {current.type === "text" && (
            <Input
              value={(answers[current.key] as string) ?? ""}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={current.placeholder}
              className="text-lg py-6"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && canProceed()) {
                  isLast ? handleFinish() : handleNext();
                }
              }}
            />
          )}

          {/* Multi-select options */}
          {current.type === "multi" && current.options && (
            <div className="flex flex-wrap gap-2">
              {current.options.map((opt) => {
                const selected = (
                  (answers[current.key] as string[]) ?? []
                ).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleToggleOption(opt.value)}
                    className={`px-4 py-2.5 rounded-full border text-sm font-medium cursor-pointer transition-all ${
                      selected
                        ? "border-accent-app bg-accent-soft text-accent-app"
                        : "border-line text-ink-light hover:border-ink-faint"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.desc && (
                      <span className="block text-[11px] font-normal text-muted-app mt-0.5">
                        {opt.desc}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-10">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            {isLast ? (
              <Button
                onClick={handleFinish}
                disabled={!canProceed()}
                size="lg"
              >
                <Check className="w-4 h-4 mr-2" />
                Finish
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                size="lg"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function asArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}
