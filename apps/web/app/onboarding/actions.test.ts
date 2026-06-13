import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks (hoisted by vitest) ---
const rpc = vi.fn();
const getUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, rpc })),
}));

vi.mock("@/lib/geocode", () => ({
  geocodeAU: vi.fn(async () => ({ lat: -33.8, lng: 151.2 })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    // Next's redirect() throws to halt execution; mirror that so the happy
    // path can be asserted via a thrown sentinel rather than a return value.
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { completeOnboarding } from "./actions";
import type { OnboardingState } from "./types";

const validSigner: OnboardingState = {
  mode: "signer",
  firstName: "Ada",
  lastName: "Lovelace",
  suburb: "Newtown",
  postcode: "2042",
  state: "NSW",
  preferredContact: "email",
  acceptedTerms: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1", email: "ada@example.com" } } });
  rpc.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("completeOnboarding validation", () => {
  it("rejects a missing mode without calling the RPC", async () => {
    const res = await completeOnboarding({ ...validSigner, mode: undefined });
    expect(res).toEqual({ error: expect.stringContaining("how you'll use") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects missing names without calling the RPC", async () => {
    const res = await completeOnboarding({ ...validSigner, firstName: "", lastName: "" });
    expect(res).toEqual({ error: expect.stringContaining("first and last name") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects missing location (no suburb and no postcode)", async () => {
    const res = await completeOnboarding({ ...validSigner, suburb: "", postcode: "" });
    expect(res).toEqual({ error: expect.stringContaining("suburb or postcode") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects unaccepted terms without calling the RPC", async () => {
    const res = await completeOnboarding({ ...validSigner, acceptedTerms: false });
    expect(res).toEqual({ error: expect.stringContaining("accept the Terms") });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("completeOnboarding auth + commit", () => {
  it("returns the email-guard error when the session user has no email", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: null } } });
    const res = await completeOnboarding(validSigner);
    expect(res).toEqual({ error: expect.stringContaining("email") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("commits via the complete_onboarding RPC with p_is_interpreter true for interpreters", async () => {
    const state: OnboardingState = { ...validSigner, mode: "interpreter", workingRadiusKm: 25 };
    // success → redirect() throws the sentinel
    await expect(completeOnboarding(state)).rejects.toThrow("NEXT_REDIRECT:/onboarding/done");
    expect(rpc).toHaveBeenCalledWith(
      "complete_onboarding",
      expect.objectContaining({
        p_email: "ada@example.com",
        p_is_interpreter: true,
        p_active_role: "interpreter",
        p_working_radius_km: 25,
      }),
    );
  });

  it("commits with p_is_interpreter false for a signer", async () => {
    await expect(completeOnboarding(validSigner)).rejects.toThrow("NEXT_REDIRECT:/onboarding/done");
    expect(rpc).toHaveBeenCalledWith(
      "complete_onboarding",
      expect.objectContaining({ p_is_interpreter: false, p_active_role: "signer" }),
    );
  });

  it("returns the generic failure message and does not redirect when the RPC errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ error: { message: "boom" } });
    const res = await completeOnboarding(validSigner);
    expect(res).toEqual({ error: expect.stringContaining("couldn't finish") });
  });
});
