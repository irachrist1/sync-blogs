"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user } = useCurrentUser();
  const router = useRouter();

  const settings = useQuery(
    api.settings.getSettings,
    user ? { userId: user._id } : "skip"
  );

  const updateWatchlist = useMutation(api.settings.updateWatchlist);

  const [watchlistText, setWatchlistText] = useState("");

  const profile = user?.writingProfile;

  const handleSaveWatchlist = () => {
    if (!user) return;
    try {
      const parsed = JSON.parse(watchlistText);
      updateWatchlist({ userId: user._id, versionWatchlist: parsed });
    } catch {
      const entries: Record<string, string> = {};
      watchlistText.split("\n").forEach((line) => {
        const [name, version] = line.split(":").map((s) => s.trim());
        if (name && version) entries[name] = version;
      });
      updateWatchlist({ userId: user._id, versionWatchlist: entries });
    }
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
            <CardTitle className="text-base">Version Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-app mb-3">
              Track technology versions to detect stale references in your posts.
              One per line: &quot;name: version&quot;
            </p>
            <Textarea
              value={watchlistText}
              onChange={(e) => setWatchlistText(e.target.value)}
              placeholder={"react: 19\nnext: 15\ntailwind: 4"}
              className="min-h-[120px] mb-3"
            />
            <Button size="sm" onClick={handleSaveWatchlist}>
              Save watchlist
            </Button>
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
