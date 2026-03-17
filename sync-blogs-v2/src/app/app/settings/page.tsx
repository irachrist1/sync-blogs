"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const [modelSaved, setModelSaved] = useState(false);

  const profile = user?.writingProfile;
  const currentModel = user?.preferredModel ?? "claude-sonnet-4-6";

  const handleModelChange = async (model: string) => {
    await updatePreferredModel({ preferredModel: model });
    setModelSaved(true);
    setTimeout(() => setModelSaved(false), 2000);
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
            {profile ? (
              <div className="space-y-3">
                {Object.entries(profile).map(([key, values]) => {
                  if (!values || (Array.isArray(values) && values.length === 0))
                    return null;
                  return (
                    <div key={key}>
                      <p className="text-xs text-muted-app capitalize mb-1">
                        {key.replace(/([A-Z])/g, " $1")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(values as string[]).map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-app">No profile set up yet.</p>
            )}
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
