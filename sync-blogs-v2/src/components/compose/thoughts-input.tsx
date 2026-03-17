"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ClarifyQuestions } from "./clarify-questions";
import { DraftOptions } from "./draft-options";

interface ThoughtsInputProps {
  postId: Id<"posts">;
  post: Doc<"posts"> & { latestRevision: unknown };
}

type ComposeStage = "thoughts" | "clarify" | "drafts";

export function ThoughtsInput({ postId, post }: ThoughtsInputProps) {
  const { user } = useCurrentUser();

  const draftProgress = useQuery(api.posts.getDraftProgress, { postId });
  const saveDraftProgress = useMutation(api.posts.saveDraftProgress);
  const generateClarify = useAction(api.ai.generateClarifyingQuestions);
  const composeDrafts = useAction(api.ai.composeDrafts);

  // Task progress for real-time status
  const taskProgress = useQuery(api.taskProgress.getProgress, {
    postId,
    taskType: "compose",
  });

  const [roughInput, setRoughInput] = useState("");
  const [stage, setStage] = useState<ComposeStage>("thoughts");
  const [clarifyData, setClarifyData] = useState<{
    questions: Array<{ question: string; options: string[] }>;
    answers: Record<string, string[]>;
  } | null>(null);
  const [drafts, setDrafts] = useState<
    Array<{ content: string; titleSuggestion?: string }>
  >([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStartTime, setGenerateStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync from Convex on load
  useEffect(() => {
    if (draftProgress) {
      if (!roughInput) setRoughInput(draftProgress.roughInput ?? "");
      if (draftProgress.clarifyingQuestions) {
        setClarifyData({
          questions: draftProgress.clarifyingQuestions as Array<{
            question: string;
            options: string[];
          }>,
          answers:
            (draftProgress.clarifyingAnswers as Record<string, string[]>) ?? {},
        });
        if (stage === "thoughts") setStage("clarify");
      }
    }
  }, [draftProgress]);

  // Timer for elapsed seconds during generation
  useEffect(() => {
    if (isGenerating) {
      setGenerateStartTime(Date.now());
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (generateStartTime ?? Date.now())) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
      setGenerateStartTime(null);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  // Auto-save rough input (debounced)
  const autoSave = useCallback(
    (value: string) => {
      const timeout = setTimeout(() => {
        saveDraftProgress({
          postId,
          draftProgress: {
            roughInput: value,
            clarifyingQuestions: draftProgress?.clarifyingQuestions,
            clarifyingAnswers: draftProgress?.clarifyingAnswers,
          },
        });
      }, 1000);
      return () => clearTimeout(timeout);
    },
    [postId, saveDraftProgress, draftProgress]
  );

  useEffect(() => {
    if (roughInput) {
      const cleanup = autoSave(roughInput);
      return cleanup;
    }
  }, [roughInput, autoSave]);

  const handleGenerateClarify = async () => {
    if (!roughInput.trim() || !user) return;
    setIsThinking(true);

    try {
      const questions = await generateClarify({
        roughInput,
        writingProfile: user.writingProfile,
      });

      const formatted = questions.map((q) => ({
        question: q.question,
        options: q.options,
      }));

      setClarifyData({ questions: formatted, answers: {} });

      await saveDraftProgress({
        postId,
        draftProgress: {
          roughInput,
          clarifyingQuestions: formatted,
          clarifyingAnswers: {},
        },
      });

      setStage("clarify");
    } catch (err) {
      console.error("Failed to generate clarifying questions:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleGenerateDrafts = async (
    answers?: Record<string, string[]>
  ) => {
    if (!user) return;
    setIsGenerating(true);

    try {
      if (answers) {
        await saveDraftProgress({
          postId,
          draftProgress: {
            roughInput,
            clarifyingQuestions: clarifyData?.questions,
            clarifyingAnswers: answers,
          },
        });
      }

      const clarifyingAnswers: Record<string, string> = {};
      if (answers && clarifyData) {
        clarifyData.questions.forEach((q, idx) => {
          const ans = answers[String(idx)];
          if (ans?.length) {
            const safeKey = `q${idx}`;
            clarifyingAnswers[safeKey] = `${q.question}: ${ans.join(", ")}`;
          }
        });
      }

      const result = await composeDrafts({
        postId,
        userId: user._id,
        title: post.title,
        roughInput,
        writingProfile: user.writingProfile,
        clarifyingAnswers:
          Object.keys(clarifyingAnswers).length > 0
            ? clarifyingAnswers
            : undefined,
      });

      setDrafts(
        result.map((opt) => ({
          content: opt.draft,
          titleSuggestion: opt.titleSuggestion,
        }))
      );
      setStage("drafts");
    } catch (err) {
      console.error("Failed to generate drafts:", err);
      // Stay on clarify so user can retry
    } finally {
      setIsGenerating(false);
    }
  };

  // Get button label based on progress
  const getGenerateLabel = () => {
    if (!isGenerating) return "Generate with these answers";
    const msg = taskProgress?.message;
    if (msg) return msg;
    if (elapsed < 5) return "Writing your draft\u2026";
    if (elapsed < 15) return "Analyzing your notes\u2026";
    if (elapsed < 30) return "Composing drafts\u2026";
    if (elapsed < 50) return "Polishing the output\u2026";
    return "Finishing up\u2026";
  };

  const getElapsedLabel = () => {
    if (!isGenerating || elapsed < 5) return null;
    return `${elapsed}s`;
  };

  if (stage === "clarify" && clarifyData) {
    return (
      <ClarifyQuestions
        questions={clarifyData.questions}
        initialAnswers={clarifyData.answers}
        onSubmit={(answers) => handleGenerateDrafts(answers)}
        onSkip={() => handleGenerateDrafts()}
        onBack={() => setStage("thoughts")}
        isGenerating={isGenerating}
        generateLabel={getGenerateLabel()}
        elapsedLabel={getElapsedLabel()}
      />
    );
  }

  if (stage === "drafts") {
    return (
      <DraftOptions
        postId={postId}
        drafts={drafts}
        onBack={() => setStage("clarify")}
      />
    );
  }

  return (
    <div className="thoughts-container">
      <h2 className="thoughts-prompt">
        Dump everything here. Don&apos;t edit yourself.
      </h2>

      <textarea
        value={roughInput}
        onChange={(e) => setRoughInput(e.target.value)}
        placeholder="Paste your notes, bullet points, voice memo transcript, half-formed arguments — anything. The messier the better."
        className="rough-input"
      />

      <div className="thoughts-footer">
        <button
          onClick={handleGenerateClarify}
          disabled={!roughInput.trim() || isThinking}
          className="btn-primary-action"
        >
          {isThinking && <span className="btn-spinner" />}
          <span className="btn-label">
            {isThinking ? "Thinking\u2026" : "Turn this into a draft"}
          </span>
        </button>
      </div>
    </div>
  );
}
