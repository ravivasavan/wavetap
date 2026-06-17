"use client";

import { Button } from "@heroui/react";
import { Check, CircleAlert } from "lucide-react";
import { useState, useTransition } from "react";

import { confirmInterpreters } from "../../actions";

type Interpreter = {
  id: string;
  name: string;
  area: string;
  bio: string | null;
  isDeafInterpreter: boolean;
  acceptsRemote: boolean;
};

export function SelectInterpreters({
  bookingId,
  slotCount,
  interpreters,
}: {
  bookingId: string;
  slotCount: number;
  interpreters: Interpreter[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmInterpreters(bookingId, [...selected]);
      // Success redirects server-side; only an error returns here.
      if (res?.error) setError(res.error);
    });
  }

  const atTarget = selected.size === slotCount;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {interpreters.map((it) => {
          const isSel = selected.has(it.id);
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => toggle(it.id)}
                aria-pressed={isSel}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  isSel
                    ? "border-[var(--accent)] bg-[var(--surface-secondary)]"
                    : "border-[var(--border)] hover:bg-[var(--surface-secondary)]"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    isSel ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)]"
                  }`}
                >
                  {isSel ? (
                    <Check size={14} strokeWidth={2.5} className="text-[var(--accent-foreground)]" />
                  ) : null}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-foreground font-medium">
                    {it.name}
                    {it.isDeafInterpreter ? (
                      <span className="text-muted ml-2 text-xs">Deaf interpreter</span>
                    ) : null}
                  </span>
                  {it.area ? <span className="text-muted text-sm">{it.area}</span> : null}
                  {it.bio ? <span className="text-muted text-sm">{it.bio}</span> : null}
                  {it.acceptsRemote ? (
                    <span className="text-muted text-xs">Available remotely</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p
          className="text-danger flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} className="shrink-0" />
          {error}
        </p>
      ) : null}

      <Button fullWidth isPending={pending} isDisabled={!atTarget} onPress={confirm}>
        {atTarget
          ? `Confirm ${selected.size} interpreter${selected.size === 1 ? "" : "s"}`
          : `Select ${slotCount} (${selected.size} chosen)`}
      </Button>
    </div>
  );
}
