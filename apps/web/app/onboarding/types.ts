// Shared onboarding types + pure helpers. No React — safe in both client
// (forms, sessionStorage hook) and server (the completeOnboarding action).

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type Period = "daytime" | "evening" | "all_day";
export type DayAvailability = { available: boolean; period: Period | null };
export type AvailabilityPattern = Record<Weekday, DayAvailability>;

export type OnboardingMode = "signer" | "interpreter" | "both";
export type PreferredContact = "email" | "mobile" | "both";

export type OnboardingState = {
  mode?: OnboardingMode;
  firstName?: string;
  lastName?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  preferredContact?: PreferredContact;
  mobile?: string;
  // interpreter-only
  workingRadiusKm?: number;
  availability?: AvailabilityPattern;
  bio?: string;
  isDeafInterpreter?: boolean;
  acceptsRemote?: boolean;
  // terms
  acceptedTerms?: boolean;
};

export function rolesFromMode(mode: OnboardingMode): ("signer" | "interpreter")[] {
  return mode === "both" ? ["signer", "interpreter"] : [mode];
}

/** Dual-role users default to the demand side (signer) per the onboarding ADR. */
export function activeRoleFromMode(mode: OnboardingMode): "signer" | "interpreter" {
  return rolesFromMode(mode).includes("signer") ? "signer" : "interpreter";
}

export function isInterpreter(mode?: OnboardingMode): boolean {
  return mode === "interpreter" || mode === "both";
}

export function emptyAvailability(): AvailabilityPattern {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day] = { available: false, period: null };
    return acc;
  }, {} as AvailabilityPattern);
}

/** An interpreter is "live" in the pool only with area + availability (ADR live-gate). */
export function isLiveInterpreter(state: OnboardingState): boolean {
  const hasArea = Boolean(state.suburb?.trim() || state.postcode?.trim());
  const hasAvailability = Boolean(
    state.availability && Object.values(state.availability).some((d) => d.available),
  );
  return hasArea && hasAvailability;
}
