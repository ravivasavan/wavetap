import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const upsert = vi.fn().mockResolvedValue({ error: null });

// .from(...).select(...).eq(...).eq(...).maybeSingle() and .from(...).upsert(...)
const selectChain = {
  eq: vi.fn(() => selectChain),
  maybeSingle,
};
const from = vi.fn(() => ({
  select: vi.fn(() => selectChain),
  upsert,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from })),
}));

import { checkRateLimit } from "./rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  upsert.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkRateLimit", () => {
  it("allows the first attempt when no window row exists yet", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await checkRateLimit("otp_send", "a@b.com", 5, 900)).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "otp_send", key: "a@b.com", count: 1 }),
    );
  });

  it("allows attempts up to the max within an active window", async () => {
    maybeSingle.mockResolvedValue({
      data: { window_start: new Date().toISOString(), count: 4 },
    });
    // count 4 → next 5, max 5 → still allowed
    expect(await checkRateLimit("otp_verify", "a@b.com", 5, 900)).toBe(true);
  });

  it("denies once the count would exceed the max within the window", async () => {
    maybeSingle.mockResolvedValue({
      data: { window_start: new Date().toISOString(), count: 5 },
    });
    // count 5 → next 6, max 5 → denied
    expect(await checkRateLimit("otp_verify", "a@b.com", 5, 900)).toBe(false);
  });

  it("resets and allows when the stored window has expired", async () => {
    maybeSingle.mockResolvedValue({
      data: { window_start: new Date(Date.now() - 1_000_000).toISOString(), count: 99 },
    });
    // window older than 900s → reset to count 1 → allowed
    expect(await checkRateLimit("otp_send", "a@b.com", 5, 900)).toBe(true);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
  });

  it("fails open (allows) when the storage lookup throws", async () => {
    maybeSingle.mockRejectedValue(new Error("db down"));
    expect(await checkRateLimit("otp_send", "a@b.com", 5, 900)).toBe(true);
  });
});
