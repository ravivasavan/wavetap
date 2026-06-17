"use client";

import { Button, Switch } from "@heroui/react";
import { Check, CircleAlert } from "lucide-react";
import { useState, useTransition } from "react";

import { updateNotificationPrefs } from "../../account/actions";

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] px-4 py-3.5">
      <div className="flex flex-col">
        <span className="text-foreground text-sm font-medium">{label}</span>
        {hint ? <span className="text-muted text-xs">{hint}</span> : null}
      </div>
      <Switch isSelected={value} onChange={onChange} aria-label={label}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch>
    </div>
  );
}

export function NotificationForm({
  initial,
}: {
  initial: { email: boolean; push: boolean; sms: boolean };
}) {
  const [email, setEmail] = useState(initial.email);
  const [push, setPush] = useState(initial.push);
  const [sms, setSms] = useState(initial.sms);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateNotificationPrefs({ email, push, sms });
      if (res && "error" in res) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ToggleRow label="Email" hint="Interest and confirmation updates by email." value={email} onChange={(v) => { setEmail(v); setSaved(false); }} />
      <ToggleRow label="Push" hint="Mobile push (coming with the native app)." value={push} onChange={(v) => { setPush(v); setSaved(false); }} />
      <ToggleRow label="SMS" hint="Text message alerts." value={sms} onChange={(v) => { setSms(v); setSaved(false); }} />

      {error ? (
        <p
          className="text-danger flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} className="shrink-0" />
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-success flex items-center gap-2 text-sm">
          <Check size={16} strokeWidth={1.5} className="shrink-0" />
          Saved.
        </p>
      ) : null}

      <Button isPending={pending} onPress={save}>
        Save preferences
      </Button>
    </div>
  );
}
