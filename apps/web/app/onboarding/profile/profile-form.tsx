"use client";

import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { ArrowRight, CircleAlert, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { isInterpreter, type PreferredContact } from "../types";
import { patchOnboarding, readOnboarding } from "../use-onboarding";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const CONTACTS: { id: PreferredContact; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "mobile", label: "Mobile" },
  { id: "both", label: "Email & mobile" },
];

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

export function ProfileForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [contact, setContact] = useState<PreferredContact>("email");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const s = readOnboarding();
    if (s.firstName) setFirstName(s.firstName);
    if (s.lastName) setLastName(s.lastName);
    if (s.suburb) setSuburb(s.suburb);
    if (s.postcode) setPostcode(s.postcode);
    if (s.state) setStateVal(s.state);
    if (s.preferredContact) setContact(s.preferredContact);
    if (s.mobile) setMobile(s.mobile);
    // Warm both possible next routes so navigation feels instant.
    router.prefetch("/onboarding/interpreter");
    router.prefetch("/onboarding/notifications");
  }, [router]);

  const needsMobile = contact === "mobile" || contact === "both";

  function next() {
    setError(null);
    if (!firstName.trim() || !lastName.trim())
      return setError("Please enter your first and last name.");
    if (!suburb.trim() && !postcode.trim()) return setError("Enter your suburb or postcode.");
    if (needsMobile && !mobile.trim()) return setError("Add a mobile number, or choose Email.");
    const s = patchOnboarding({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      suburb: suburb.trim(),
      postcode: postcode.trim(),
      state: stateVal || undefined,
      preferredContact: contact,
      mobile: mobile.trim() || undefined,
    });
    startTransition(() => {
      router.push(isInterpreter(s.mode) ? "/onboarding/interpreter" : "/onboarding/notifications");
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <div className="flex gap-3">
        <TextField value={firstName} onChange={setFirstName} isRequired className="flex-1">
          <Label>First name</Label>
          <Input placeholder="First" autoComplete="given-name" />
        </TextField>
        <TextField value={lastName} onChange={setLastName} isRequired className="flex-1">
          <Label>Last name</Label>
          <Input placeholder="Last" autoComplete="family-name" />
        </TextField>
      </div>

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
        Others only ever see your suburb — never your exact address.
      </p>

      <FieldSelect
        label="Preferred contact"
        placeholder="Select"
        value={contact}
        onChange={(v) => setContact(v as PreferredContact)}
        items={CONTACTS}
      />

      {needsMobile ? (
        <TextField value={mobile} onChange={setMobile} className="w-full">
          <Label>Mobile</Label>
          <Input placeholder="04xx xxx xxx" inputMode="tel" autoComplete="tel" />
        </TextField>
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

      <Button fullWidth isPending={pending} onPress={next}>
        Continue
        <ArrowRight size={18} strokeWidth={1.5} />
      </Button>
    </motion.div>
  );
}
