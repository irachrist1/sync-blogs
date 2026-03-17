"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";

export function EmptyState() {
  const { user } = useCurrentUser();
  const createPost = useMutation(api.posts.createPost);
  const router = useRouter();

  const handleNewPost = async () => {
    if (!user) return;
    const postId = await createPost({
      userId: user._id,
      title: "Untitled",
    });
    router.push(`/app/${postId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="max-w-md">
        <h2
          className="text-3xl font-medium mb-4"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
        >
          What are you trying to say?
        </h2>
        <p className="text-[var(--color-muted-app)] mb-8 text-base leading-relaxed">
          Start a new draft and dump your raw thinking. We&apos;ll help you shape it.
        </p>
        <button onClick={handleNewPost} className="btn-primary-action">
          <span className="btn-label">Start writing</span>
        </button>
      </div>
    </div>
  );
}
