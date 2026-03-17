"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  const { user, isLoaded } = useCurrentUser();
  const router = useRouter();

  // If already onboarded, redirect to app
  useEffect(() => {
    if (user?.onboardingCompleted) {
      router.push("/app");
    }
  }, [user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted-app">Loading...</p>
      </div>
    );
  }

  return <OnboardingWizard />;
}
