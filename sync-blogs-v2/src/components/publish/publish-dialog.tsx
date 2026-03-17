"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, Lock } from "lucide-react";

interface PublishDialogProps {
  postId: Id<"posts">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({
  postId,
  open,
  onOpenChange,
}: PublishDialogProps) {
  const [visibility, setVisibility] = useState<"private" | "public">("public");
  const publishPost = useMutation(api.posts.publishPost);

  const handlePublish = async () => {
    await publishPost({ postId, visibility });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish this post</DialogTitle>
          <DialogDescription>
            Choose who can see your published post.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <button
            onClick={() => setVisibility("public")}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
              visibility === "public"
                ? "border-accent-app bg-accent-soft"
                : "border-line hover:border-ink-faint"
            }`}
          >
            <Globe className="w-5 h-5 text-accent-app shrink-0" />
            <div>
              <p className="text-sm font-medium text-ink">Public</p>
              <p className="text-xs text-muted-app">
                Anyone with the link can read it
              </p>
            </div>
          </button>

          <button
            onClick={() => setVisibility("private")}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
              visibility === "private"
                ? "border-accent-app bg-accent-soft"
                : "border-line hover:border-ink-faint"
            }`}
          >
            <Lock className="w-5 h-5 text-muted-app shrink-0" />
            <div>
              <p className="text-sm font-medium text-ink">Private</p>
              <p className="text-xs text-muted-app">Only you can see it</p>
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish}>Publish</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
