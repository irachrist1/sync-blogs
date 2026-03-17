"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", desc: "Fast · Recommended" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6", desc: "Most capable · Slower" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", desc: "Fastest · Cheapest" },
];


export default function SettingsPage() {
  const { user } = useCurrentUser();
  const router = useRouter();

  const updatePreferredModel = useMutation(api.users.updatePreferredModel);
  const updateWritingProfile = useMutation(
    (api.users as any).updateWritingProfile
  );

  const [modelSaved, setModelSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const profile = user?.writingProfile;
  const currentModel = user?.preferredModel ?? "claude-sonnet-4-6";

  // Writing profile input state (comma-separated strings)
  const [toneInput, setToneInput] = useState<string>(() =>
    profile?.tone?.join(", ") ?? ""
  );
  const [sentenceStyleInput, setSentenceStyleInput] = useState<string>(() =>
    profile?.sentenceStyle?.join(", ") ?? ""
  );
  const [structureInput, setStructureInput] = useState<string>(() =>
    profile?.structure?.join(", ") ?? ""
  );
  const [lengthInput, setLengthInput] = useState<string>(() =>
    profile?.lengthPreference?.join(", ") ?? ""
  );
  const [destinationInput, setDestinationInput] = useState<string>(() =>
    profile?.destination?.join(", ") ?? ""
  );

  const handleModelChange = async (model: string) => {
    await updatePreferredModel({ preferredModel: model });
    setModelSaved(true);
    setTimeout(() => setModelSaved(false), 2000);
  };

  const splitInput = (val: string): string[] =>
    val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSaveProfile = async () => {
    await updateWritingProfile({
      writingProfile: {
        tone: splitInput(toneInput),
        sentenceStyle: splitInput(sentenceStyleInput),
        structure: splitInput(structureInput),
        lengthPreference: splitInput(lengthInput),
        destination: splitInput(destinationInput),
      },
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="max-w-prose mx-auto py-12 px-6">
      <h2 className="text-xl font-semibold text-ink mb-8">Settings</h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Writing Profile</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/onboarding")}
              >
                Redo onboarding
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-app mb-4">
              Edit your writing preferences. Separate values with commas.
            </p>

            <div className="settings-field">
              <label className="settings-label">Tone</label>
              <input
                type="text"
                className="settings-input"
                value={toneInput}
                onChange={(e) => setToneInput(e.target.value)}
                placeholder="conversational, formal, analytical"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Sentence Style</label>
              <input
                type="text"
                className="settings-input"
                value={sentenceStyleInput}
                onChange={(e) => setSentenceStyleInput(e.target.value)}
                placeholder="short and punchy, flowing, varied"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Structure</label>
              <input
                type="text"
                className="settings-input"
                value={structureInput}
                onChange={(e) => setStructureInput(e.target.value)}
                placeholder="listicle, narrative, essay"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Length</label>
              <input
                type="text"
                className="settings-input"
                value={lengthInput}
                onChange={(e) => setLengthInput(e.target.value)}
                placeholder="short, medium, long-form"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Where you publish</label>
              <input
                type="text"
                className="settings-input"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                placeholder="Substack, personal blog, Medium"
              />
            </div>

            <div className="flex items-center gap-3 mt-2">
              <Button onClick={handleSaveProfile} size="sm">
                Save profile
              </Button>
              {profileSaved && (
                <span className="text-xs text-[var(--color-accent-app)]">Saved.</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Model</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-app mb-4">
              Choose which Claude model powers your drafts and reviews.
            </p>
            <div className="space-y-2">
              {MODEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleModelChange(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    currentModel === opt.value
                      ? "border-[var(--color-accent-app)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-line)] hover:border-[var(--color-accent-muted)] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${currentModel === opt.value ? "text-[var(--color-accent-app)]" : "text-[var(--color-ink)]"}`}>
                      {opt.label}
                    </span>
                    {currentModel === opt.value && (
                      <span className="text-xs font-semibold text-[var(--color-accent-app)]">Selected</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-muted-app)]">{opt.desc}</span>
                </button>
              ))}
            </div>
            {modelSaved && (
              <p className="text-xs text-[var(--color-accent-app)] mt-3">Saved.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Runtime Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-app" />
              <span className="text-sm text-ink-light">
                Convex connected
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
