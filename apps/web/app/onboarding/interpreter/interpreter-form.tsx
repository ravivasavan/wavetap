"use client";

import { Button, Input, Label, ListBox, Select, Switch, TextField } from "@heroui/react";
import { ArrowRight, CircleCheck, Clock, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  WEEKDAYS,
  emptyAvailability,
  type AvailabilityPattern,
  type Period,
  type Weekday,
} from "../types";
import { patchOnboarding, readOnboarding } from "../use-onboarding";

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
      aria-label={label}
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

export function InterpreterForm() {
  const router = useRouter();
  const [radius, setRadius] = useState(30);
  const [availability, setAvailability] = useState<AvailabilityPattern>(emptyAvailability());
  const [bio, setBio] = useState("");
  const [isDI, setIsDI] = useState(false);
  const [remote, setRemote] = useState(true);
  const [hasArea, setHasArea] = useState(false);

  useEffect(() => {
    const s = readOnboarding();
    if (s.workingRadiusKm) setRadius(s.workingRadiusKm);
    if (s.availability) setAvailability(s.availability);
    if (s.bio) setBio(s.bio);
    if (typeof s.isDeafInterpreter === "boolean") setIsDI(s.isDeafInterpreter);
    if (typeof s.acceptsRemote === "boolean") setRemote(s.acceptsRemote);
    setHasArea(Boolean(s.suburb?.trim() || s.postcode?.trim()));
  }, []);

  function toggleDay(day: Weekday, on: boolean) {
    setAvailability((a) => ({
      ...a,
      [day]: on ? { available: true, period: a[day].period ?? "daytime" } : { available: false, period: null },
    }));
  }
  function setDayPeriod(day: Weekday, period: Period) {
    setAvailability((a) => ({ ...a, [day]: { available: true, period } }));
  }

  const hasAvailability = Object.values(availability).some((d) => d.available);
  const isLive = hasArea && hasAvailability;

  function next() {
    patchOnboarding({
      workingRadiusKm: radius,
      availability,
      bio: bio.trim() || undefined,
      isDeafInterpreter: isDI,
      acceptsRemote: remote,
    });
    router.push("/onboarding/notifications");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      {/* Live-status indicator (ADR live-gate: area + availability) */}
      <div
        className={`flex items-center gap-3 rounded-2xl border p-3 ${
          isLive
            ? "border-transparent bg-[var(--success-soft)]"
            : "border-[var(--border)] bg-[var(--surface)]"
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
            <span className="text-foreground font-medium">You&apos;ll appear in the interpreter pool.</span>
          ) : (
            <span className="text-muted">
              Set your area and at least one day to appear in the pool — you can finish this later.
            </span>
          )}
        </p>
      </div>

      <Picker
        label="Working radius"
        value={String(radius)}
        onChange={(v) => setRadius(Number(v))}
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

      <TextField value={bio} onChange={setBio} className="w-full">
        <Label>Short bio (optional)</Label>
        <Input placeholder="A line about your experience" />
      </TextField>

      <div className="flex flex-col gap-3">
        <Switch isSelected={isDI} onChange={setIsDI}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <Label className="text-sm">I&apos;m a Deaf interpreter</Label>
          </Switch.Content>
        </Switch>
        <Switch isSelected={remote} onChange={setRemote}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Available for remote bookings</Label>
          </Switch.Content>
        </Switch>
      </div>

      <Button fullWidth onPress={next}>
        Continue
        <ArrowRight size={18} strokeWidth={1.5} />
      </Button>
    </motion.div>
  );
}
