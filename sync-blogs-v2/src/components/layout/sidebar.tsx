"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PostListItem } from "../posts/post-list-item";
import { Plus, LogOut } from "lucide-react";
import { useState } from "react";
import type { PostStatus } from "@/lib/constants";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useCurrentUser();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const params = useParams();
  const selectedPostId = params?.postId as string | undefined;

  const [statusFilter, setStatusFilter] = useState<PostStatus | undefined>(
    undefined
  );

  const posts = useQuery(
    api.posts.listPosts,
    user
      ? { userId: user._id, status: statusFilter }
      : "skip"
  );

  const createPost = useMutation(api.posts.createPost);

  const handleNewPost = async () => {
    if (!user) return;
    const postId = await createPost({
      userId: user._id,
      title: "Untitled",
    });
    router.push(`/app/${postId}`);
    onNavigate?.();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside className="w-64 border-r border-line bg-paper flex flex-col h-full">
      <div className="p-4 border-b border-line flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Sync Blogs</h1>
        <button
          onClick={handleSignOut}
          className="p-1.5 rounded-md text-muted-app hover:text-ink-light hover:bg-line-light transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3">
        <button
          onClick={handleNewPost}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-accent-app)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Draft
        </button>
      </div>

      <div className="px-3 pb-2 flex gap-1">
        {(
          [undefined, "draft", "published", "archived"] as (
            | PostStatus
            | undefined
          )[]
        ).map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              statusFilter === s
                ? "bg-accent-soft text-accent-app font-medium"
                : "text-muted-app hover:text-ink-light"
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {posts?.map((post) => (
          <PostListItem
            key={post._id}
            post={post}
            isSelected={selectedPostId === post._id}
            onClick={() => { router.push(`/app/${post._id}`); onNavigate?.(); }}
          />
        ))}
        {posts?.length === 0 && (
          <p className="text-sm text-muted-app text-center py-8">
            No posts yet
          </p>
        )}
      </div>

      <div className="p-3 border-t border-line">
        <button
          onClick={() => router.push("/app/settings")}
          className="w-full text-left px-3 py-2 text-sm text-muted-app hover:text-ink-light rounded-lg hover:bg-line-light transition-colors"
        >
          Settings
        </button>
      </div>
    </aside>
  );
}
