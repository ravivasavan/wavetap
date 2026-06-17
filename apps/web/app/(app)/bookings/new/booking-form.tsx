"use client";

import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { ArrowRight, CircleAlert, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useState, useTransition } from "react";

import { createBooking } from "../actions";

type Mode = "in_person" | "remote";
const MODES: { id: Mode; label: string }[] = [
  { id: "in_person", label: "In person" },
  { id: "remote", label: "Remote" },
];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

function FieldSelect({
  label,
  placeholder,
  value,
  onChange,
  items,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange: (v: string) => void;
  items: { id: string; label: string }[];
}) {
  return (
    <Select
      className="w-full"
      placeholder={placeholder}
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

export function BookingForm() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [mode, setMode] = useState<Mode>("in_person");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isInPerson = mode === "in_person";

  function submit() {
    setError(null);
    if (!title.trim()) return setError("Please give your booking a title.");
    if (!date) return setError("Please choose a date.");
    if (!startTime) return setError("Please choose a start time.");
    if (isInPerson && !suburb.trim() && !postcode.trim())
      return setError("For an in-person booking, enter a suburb or postcode.");

    startTransition(async () => {
      const res = await createBooking({
        title: title.trim(),
        bookingDate: date,
        startTime,
        endTime: endTime.trim() || undefined,
        mode,
        suburb: suburb.trim() || undefined,
        postcode: postcode.trim() || undefined,
        state: stateVal || undefined,
      });
      // On success the action redirects; only an error returns here.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <TextField value={title} onChange={setTitle} isRequired className="w-full">
        <Label>What do you need an interpreter for?</Label>
        <Input placeholder="e.g. GP appointment" autoComplete="off" />
      </TextField>

      <div className="flex gap-3">
        <TextField value={date} onChange={setDate} isRequired className="flex-1">
          <Label>Date</Label>
          <Input type="date" />
        </TextField>
        <TextField value={startTime} onChange={setStartTime} isRequired className="w-32">
          <Label>Start</Label>
          <Input type="time" />
        </TextField>
        <TextField value={endTime} onChange={setEndTime} className="w-32">
          <Label>End</Label>
          <Input type="time" />
        </TextField>
      </div>

      <FieldSelect
        label="Mode"
        placeholder="Select"
        value={mode}
        onChange={(v) => setMode(v as Mode)}
        items={MODES}
      />

      {isInPerson ? (
        <>
          <div className="flex gap-3">
            <TextField value={suburb} onChange={setSuburb} className="flex-1">
              <Label>Suburb</Label>
              <Input placeholder="e.g. Newtown" autoComplete="address-level2" />
            </TextField>
            <TextField value={postcode} onChange={setPostcode} className="w-28">
              <Label>Postcode</Label>
              <Input placeholder="2042" inputMode="numeric" autoComplete="postal-code" />
            </TextField>
          </div>
          <FieldSelect
            label="State"
            placeholder="Select state"
            value={stateVal}
            onChange={setStateVal}
            items={STATES.map((s) => ({ id: s, label: s }))}
          />
          <p className="text-muted flex items-start gap-1.5 text-xs leading-relaxed">
            <MapPin size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            Interpreters only see your suburb — never your exact address.
          </p>
        </>
      ) : null}

      {error ? (
        <p
          className="text-danger flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} className="shrink-0" />
          {error}
        </p>
      ) : null}

      <Button fullWidth isPending={pending} onPress={submit}>
        Post booking
        <ArrowRight size={18} strokeWidth={1.5} />
      </Button>
    </motion.div>
  );
}
