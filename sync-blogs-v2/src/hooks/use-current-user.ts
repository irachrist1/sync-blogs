"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexAuth } from "convex/react";

export function useCurrentUser() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(
    api.users.currentUser,
    isAuthenticated ? {} : "skip"
  );

  return {
    user: user ?? null,
    isLoaded: !isLoading && (user !== undefined || !isAuthenticated),
    isAuthenticated,
  };
}
