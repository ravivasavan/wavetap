import { describe, expect, it } from "vitest";

import { haversineKm, isCompositionSatisfied, type Slot } from "./index";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm({ lat: -33.87, lng: 151.21 }, { lat: -33.87, lng: 151.21 })).toBe(0);
  });

  it("matches the known Sydney→Melbourne great-circle distance (~714 km)", () => {
    const sydney = { lat: -33.8688, lng: 151.2093 };
    const melbourne = { lat: -37.8136, lng: 144.9631 };
    const km = haversineKm(sydney, melbourne);
    expect(km).toBeGreaterThan(700);
    expect(km).toBeLessThan(730);
  });

  it("is symmetric", () => {
    const a = { lat: -31.95, lng: 115.86 };
    const b = { lat: -34.93, lng: 138.6 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });

  it("supports a radius test (~5 km neighbours within, far ones out)", () => {
    const home = { lat: -33.8983, lng: 151.1784 }; // Newtown
    const near = { lat: -33.8688, lng: 151.2093 }; // Sydney CBD (~4 km)
    const far = { lat: -37.8136, lng: 144.9631 }; // Melbourne
    expect(haversineKm(home, near)).toBeLessThan(5);
    expect(haversineKm(home, far)).toBeGreaterThan(5);
  });
});

describe("isCompositionSatisfied (reused, sanity)", () => {
  it("requires the confirmed count to match the slot count and meet deaf demand", () => {
    const slots: Slot[] = [{ kind: "any" }, { kind: "deaf" }];
    expect(isCompositionSatisfied(slots, [{ isDeafInterpreter: true }, { isDeafInterpreter: false }])).toBe(true);
    expect(isCompositionSatisfied(slots, [{ isDeafInterpreter: false }, { isDeafInterpreter: false }])).toBe(false);
    expect(isCompositionSatisfied(slots, [{ isDeafInterpreter: true }])).toBe(false);
  });
});
