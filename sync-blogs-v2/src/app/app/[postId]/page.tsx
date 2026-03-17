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

  // If no revision exists yet, show the compose flow
  if (!postData.latestRevision) {
    return <ThoughtsInput postId={postId} post={postData} />;
  }

  // Otherwise show the editor
  return <PostEditor postId={postId} post={postData} />;
}
