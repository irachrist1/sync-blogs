"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useCurrentUser();
  const router = useRouter();

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      router.push("/onboarding");
    }
  }, [user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-muted-app">Loading...</div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
