import type { ReactNode } from "react";

// Shared centered layout for onboarding steps (presentational; server-safe).
export function OnboardingShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        {eyebrow ? (
          <p className="text-muted text-xs font-medium uppercase tracking-widest">{eyebrow}</p>
        ) : null}
        <h1 className="text-foreground text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="text-muted text-sm">{subtitle}</p> : null}
      </div>
      {children}
    </main>
  );
}
