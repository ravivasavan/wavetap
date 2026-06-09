"use client";

import { Button } from "@heroui/react";
import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { isInterpreter } from "./types";
import { readOnboarding } from "./use-onboarding";

// Visual step order for the progress bar. The interpreter step is conditional
// (signer-only skips it), so we show a smooth proportional bar rather than a
// brittle "step N of 5".
const STEP_ORDER = [
  "/onboarding/welcome",
  "/onboarding/start",
  "/onboarding/profile",
  "/onboarding/interpreter",
  "/onboarding/notifications",
  "/onboarding/terms",
];

// Short orientation label per step, shown in the header.
const STEP_LABEL: Record<string, string> = {
  "/onboarding/welcome": "Welcome",
  "/onboarding/start": "Get started",
  "/onboarding/profile": "Your details",
  "/onboarding/interpreter": "Interpreting",
  "/onboarding/notifications": "Notifications",
  "/onboarding/terms": "Review & finish",
  "/onboarding/done": "All set",
};

// Explicit back targets (reverse of the forward flow). notifications → back
// skips the interpreter step for signer-only users, mirroring the forward logic.
function backTarget(pathname: string, mode: ReturnType<typeof readOnboarding>["mode"]): string | null {
  if (pathname.startsWith("/onboarding/start")) return "/onboarding/welcome";
  if (pathname.startsWith("/onboarding/profile")) return "/onboarding/start";
  if (pathname.startsWith("/onboarding/interpreter")) return "/onboarding/profile";
  if (pathname.startsWith("/onboarding/notifications"))
    return isInterpreter(mode) ? "/onboarding/interpreter" : "/onboarding/profile";
  if (pathname.startsWith("/onboarding/terms")) return "/onboarding/notifications";
  return null; // welcome (first) and done (terminal) have no back
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDone = pathname.startsWith("/onboarding/done");
  const idx = STEP_ORDER.findIndex((s) => pathname.startsWith(s));
  const progress = isDone ? 1 : idx < 0 ? 0 : (idx + 1) / STEP_ORDER.length;

  // Shown on every step except welcome (first) and done (terminal). Visibility
  // depends only on pathname (stable across SSR/CSR); the target is resolved on
  // click from sessionStorage, so there's no hydration mismatch.
  const showBack =
    idx > 0 && !isDone; // idx 0 = welcome → no back
  const label = Object.entries(STEP_LABEL).find(([k]) => pathname.startsWith(k))?.[1] ?? "WaveTap";

  function goBack() {
    const target = backTarget(pathname, readOnboarding().mode);
    if (target) router.push(target);
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="mx-auto flex h-10 w-full max-w-md items-center gap-2 px-6 pt-8">
        {showBack ? (
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label="Go back"
            onPress={goBack}
            className="-ml-2 text-muted"
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </Button>
        ) : null}
        <span className="text-foreground text-sm font-semibold">{label}</span>
      </header>

      <div className="mx-auto w-full max-w-md px-6 pt-4" aria-hidden="true">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <motion.div
            className="h-full rounded-full bg-[var(--accent)]"
            initial={false}
            animate={{ width: `${Math.max(progress * 100, 6)}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10"
      >
        {children}
      </motion.main>
    </div>
  );
}
