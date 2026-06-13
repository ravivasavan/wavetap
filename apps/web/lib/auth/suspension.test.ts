import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from })),
}));

import { isSuspended } from "./suspension";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isSuspended", () => {
  it("is true when suspended_at is set", async () => {
    maybeSingle.mockResolvedValue({ data: { suspended_at: "2026-06-13T00:00:00Z" } });
    expect(await isSuspended("u1")).toBe(true);
  });

  it("is false when suspended_at is null (active)", async () => {
    maybeSingle.mockResolvedValue({ data: { suspended_at: null } });
    expect(await isSuspended("u1")).toBe(false);
  });

  it("is false when no profile row is found", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await isSuspended("u1")).toBe(false);
  });
});
