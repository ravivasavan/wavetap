"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

import type { OnboardingMode } from "../types";
import { patchOnboarding } from "../use-onboarding";

const OPTIONS: { mode: OnboardingMode; title: string; desc: string }[] = [
  { mode: "signer", title: "I need an interpreter", desc: "Post requests and find an interpreter." },
  { mode: "interpreter", title: "I'm an interpreter", desc: "Browse requests and offer your availability." },
  { mode: "both", title: "Both", desc: "Switch between the two whenever you like." },
];

export function StartForm() {
  const router = useRouter();

  function choose(mode: OnboardingMode) {
    patchOnboarding({ mode });
    router.push("/onboarding/profile");
  }

  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map((o) => (
        <Button
          key={o.mode}
          variant="secondary"
          fullWidth
          onPress={() => choose(o.mode)}
          className="h-auto flex-col items-start gap-1 py-4 text-left"
        >
          <span className="text-foreground font-medium">{o.title}</span>
          <span className="text-muted text-sm font-normal">{o.desc}</span>
        </Button>
      ))}
    </div>
  );
}
