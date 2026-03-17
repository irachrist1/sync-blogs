"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ThoughtsInput } from "@/components/compose/thoughts-input";
import { PostEditor } from "@/components/editor/post-editor";

export default function PostPage() {
  const params = useParams();
  const postId = params.postId as Id<"posts">;

  const postData = useQuery(api.posts.getPost, { postId });

  if (!postData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-app">Loading post...</p>
      </div>
    );
  }

  // Show compose flow if:
  // 1. No revision exists yet, OR
  // 2. Revisions exist but user hasn't chosen a draft yet (generated drafts don't count)
  const draftChosen = (postData.draftProgress as { draftChosen?: boolean } | undefined)?.draftChosen;
  const hasManualRevision = postData.latestRevision?.source === "manual";
  const showEditor = hasManualRevision || draftChosen || (postData.latestRevision && !postData.draftProgress);

  if (!showEditor) {
    return <ThoughtsInput postId={postId} post={postData} />;
  }

  return <PostEditor postId={postId} post={postData} />;
}
