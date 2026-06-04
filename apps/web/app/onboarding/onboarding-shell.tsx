import type { ReactNode } from "react";

// Per-step content wrapper (title + subtitle + body). The page frame, wordmark
// header, progress bar, and enter animation live in layout.tsx — so this no
// longer renders its own <main>.
export function OnboardingShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted text-sm leading-relaxed">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
