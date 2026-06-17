"use client";

import { Button, Input, Label, ListBox, Select, Switch, TextField } from "@heroui/react";
import { Check, CircleAlert, CircleCheck, Clock, MapPin } from "lucide-react";
import { useState, useTransition } from "react";

import {
  WEEKDAYS,
  type AvailabilityPattern,
  type Period,
  type Weekday,
} from "@/app/onboarding/types";

import { updateAvailability } from "../account/actions";

const RADII = [5, 10, 20, 30, 50, 100];
const PERIODS: { id: Period; label: string }[] = [
  { id: "daytime", label: "Daytime" },
  { id: "evening", label: "Evening" },
  { id: "all_day", label: "All day" },
];
const DAY_LABEL: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function Picker({
  label,
  value,
  onChange,
  items,
  className,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  items: { id: string; label: string }[];
  className?: string;
}) {
  return (
    <Select
      className={className ?? "w-full"}
      selectedKey={value || null}
      onSelectionChange={(k) => onChange(String(k))}
      aria-label={label || "Select"}
    >
      {label ? <Label>{label}</Label> : null}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {items.map((it) => (
            <ListBox.Item key={it.id} id={it.id} textValue={it.label}>
              {it.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function AvailabilityForm({
  hasArea,
  initial,
}: {
  hasArea: boolean;
  initial: {
    workingRadiusKm: number;
    availability: AvailabilityPattern;
    bio: string;
    isDeafInterpreter: boolean;
    acceptsRemote: boolean;
  };
}) {
  const [radius, setRadius] = useState(initial.workingRadiusKm);
  const [availability, setAvailability] = useState<AvailabilityPattern>(initial.availability);
  const [bio, setBio] = useState(initial.bio);
  const [isDI, setIsDI] = useState(initial.isDeafInterpreter);
  const [remote, setRemote] = useState(initial.acceptsRemote);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleDay(day: Weekday, on: boolean) {
    setSaved(false);
    setAvailability((a) => ({
      ...a,
      [day]: on ? { available: true, period: a[day].period ?? "daytime" } : { available: false, period: null },
    }));
  }
  function setDayPeriod(day: Weekday, period: Period) {
    setSaved(false);
    setAvailability((a) => ({ ...a, [day]: { available: true, period } }));
  }

  const hasAvailability = Object.values(availability).some((d) => d.available);
  const isLive = hasArea && hasAvailability;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateAvailability({
        workingRadiusKm: radius,
        availability,
        bio: bio.trim() || undefined,
        isDeafInterpreter: isDI,
        acceptsRemote: remote,
      });
      if (res && "error" in res) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex items-center gap-3 rounded-2xl border p-3 ${
          isLive ? "border-transparent bg-[var(--success-soft)]" : "border-[var(--border)] bg-[var(--surface)]"
        }`}
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            isLive ? "text-[var(--success)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"
          }`}
        >
          {isLive ? <CircleCheck size={20} strokeWidth={1.5} /> : <MapPin size={18} strokeWidth={1.5} />}
        </span>
        <p className="text-sm leading-relaxed">
          {isLive ? (
            <span className="text-foreground font-medium">You appear in the interpreter pool.</span>
          ) : (
            <span className="text-muted">
              {hasArea
                ? "Set at least one available day to appear in the pool."
                : "Add your suburb in Profile, then set availability, to appear in the pool."}
            </span>
          )}
        </p>
      </div>

      <Picker
        label="Working radius"
        value={String(radius)}
        onChange={(v) => {
          setRadius(Number(v));
          setSaved(false);
        }}
        items={RADII.map((r) => ({ id: String(r), label: `${r} km` }))}
      />

      <div className="flex flex-col gap-2">
        <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <Clock size={15} strokeWidth={1.5} className="text-muted" />
          Availability
        </p>
        {WEEKDAYS.map((day) => (
          <div key={day} className="flex items-center justify-between gap-3">
            <Switch isSelected={availability[day].available} onChange={(on) => toggleDay(day, on)}>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <Label className="text-sm">{DAY_LABEL[day]}</Label>
              </Switch.Content>
            </Switch>
            {availability[day].available ? (
              <Picker
                label=""
                className="w-36"
                value={availability[day].period ?? "daytime"}
                onChange={(v) => setDayPeriod(day, v as Period)}
                items={PERIODS}
              />
            ) : null}
          </div>
        ))}
      </div>

      <TextField value={bio} onChange={(v) => { setBio(v); setSaved(false); }} className="w-full">
        <Label>Short bio (optional)</Label>
        <Input placeholder="A line about your experience" />
      </TextField>

      <div className="flex flex-col gap-3">
        <Switch isSelected={isDI} onChange={(v) => { setIsDI(v); setSaved(false); }}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <Label className="text-sm">I&apos;m a Deaf interpreter</Label>
          </Switch.Content>
        </Switch>
        <Switch isSelected={remote} onChange={(v) => { setRemote(v); setSaved(false); }}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Available for remote bookings</Label>
          </Switch.Content>
        </Switch>
      </div>

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

      <Button fullWidth isPending={pending} onPress={save}>
        Save availability
      </Button>
    </div>
  );
}
