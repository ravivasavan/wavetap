"use client";

import type { OnboardingState } from "./types";

// Wizard state lives in sessionStorage so it survives step navigation (nested
// routes don't share React state) and a mid-flow refresh, without a server
// round-trip. Committed once at the end by the completeOnboarding action.
const KEY = "wavetap.onboarding";

export function readOnboarding(): OnboardingState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) || "{}") as OnboardingState;
  } catch {
    return {};
  }
}

export function patchOnboarding(patch: Partial<OnboardingState>): OnboardingState {
  const next = { ...readOnboarding(), ...patch };
  window.sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearOnboarding(): void {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(KEY);
}
