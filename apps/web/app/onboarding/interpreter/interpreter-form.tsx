"use client";

import { Button, Input, Label, ListBox, Select, Switch, TextField } from "@heroui/react";
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
    >
      <Label>{label}</Label>
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

  useEffect(() => {
    const s = readOnboarding();
    if (s.workingRadiusKm) setRadius(s.workingRadiusKm);
    if (s.availability) setAvailability(s.availability);
    if (s.bio) setBio(s.bio);
    if (typeof s.isDeafInterpreter === "boolean") setIsDI(s.isDeafInterpreter);
    if (typeof s.acceptsRemote === "boolean") setRemote(s.acceptsRemote);
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
    <div className="flex flex-col gap-5">
      <Picker
        label="Working radius"
        value={String(radius)}
        onChange={(v) => setRadius(Number(v))}
        items={RADII.map((r) => ({ id: String(r), label: `${r} km` }))}
      />

      <div className="flex flex-col gap-2">
        <p className="text-foreground text-sm font-medium">Availability</p>
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
        {!hasAvailability ? (
          <p className="text-muted text-xs">
            Add at least one day to appear in the pool — you can do this later too.
          </p>
        ) : null}
      </div>

      <TextField value={bio} onChange={setBio} className="w-full">
        <Label>Short bio (optional)</Label>
        <Input placeholder="A line about your experience" />
      </TextField>

      <Switch isSelected={isDI} onChange={setIsDI}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Content>
          <Label className="text-sm">I'm a Deaf interpreter</Label>
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

      <Button fullWidth onPress={next}>
        Continue
      </Button>
    </div>
  );
}
