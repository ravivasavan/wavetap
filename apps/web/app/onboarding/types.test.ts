import { describe, expect, it } from "vitest";

import {
  activeRoleFromMode,
  emptyAvailability,
  isInterpreter,
  isLiveInterpreter,
  rolesFromMode,
  WEEKDAYS,
  type OnboardingState,
} from "./types";

describe("rolesFromMode", () => {
  it("expands 'both' to both roles, demand side first", () => {
    expect(rolesFromMode("both")).toEqual(["signer", "interpreter"]);
  });

  it("returns a single role for non-dual modes", () => {
    expect(rolesFromMode("signer")).toEqual(["signer"]);
    expect(rolesFromMode("interpreter")).toEqual(["interpreter"]);
  });
});

describe("activeRoleFromMode", () => {
  it("defaults dual-role users to signer (demand side)", () => {
    expect(activeRoleFromMode("both")).toBe("signer");
  });

  it("uses the sole role for single-role modes", () => {
    expect(activeRoleFromMode("signer")).toBe("signer");
    expect(activeRoleFromMode("interpreter")).toBe("interpreter");
  });
});

describe("isInterpreter", () => {
  it("is true for interpreter and both, false otherwise", () => {
    expect(isInterpreter("interpreter")).toBe(true);
    expect(isInterpreter("both")).toBe(true);
    expect(isInterpreter("signer")).toBe(false);
    expect(isInterpreter(undefined)).toBe(false);
  });
});

describe("emptyAvailability", () => {
  it("returns all seven weekdays, each unavailable with no period", () => {
    const avail = emptyAvailability();
    expect(Object.keys(avail).sort()).toEqual([...WEEKDAYS].sort());
    for (const day of WEEKDAYS) {
      expect(avail[day]).toEqual({ available: false, period: null });
    }
  });
});

describe("isLiveInterpreter", () => {
  it("is false with no area", () => {
    const avail = emptyAvailability();
    avail.monday = { available: true, period: "daytime" };
    expect(isLiveInterpreter({ availability: avail })).toBe(false);
  });

  it("is false with an area but no available day", () => {
    const state: OnboardingState = { suburb: "Newtown", availability: emptyAvailability() };
    expect(isLiveInterpreter(state)).toBe(false);
  });

  it("is true with both an area and at least one available day", () => {
    const avail = emptyAvailability();
    avail.tuesday = { available: true, period: "all_day" };
    const state: OnboardingState = { postcode: "2042", availability: avail };
    expect(isLiveInterpreter(state)).toBe(true);
  });
});
