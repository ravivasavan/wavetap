import { afterEach, describe, expect, it, vi } from "vitest";

import { geocodeAU } from "./geocode";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("geocodeAU", () => {
  it("returns null and makes no request when suburb and postcode are both empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await geocodeAU({ suburb: "", postcode: "  " })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns parsed coordinates on a successful response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ lat: "-33.8", lon: "151.2" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    expect(await geocodeAU({ suburb: "Sydney" })).toEqual({ lat: -33.8, lng: 151.2 });
  });

  it("returns null when the result array is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    expect(await geocodeAU({ postcode: "0000" })).toBeNull();
  });

  it("returns null when the response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    expect(await geocodeAU({ suburb: "Newtown" })).toBeNull();
  });

  it("returns null when fetch rejects (network error / timeout)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("aborted"));
    expect(await geocodeAU({ postcode: "2042" })).toBeNull();
  });

  it("returns null when coordinates are non-numeric", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ lat: "abc", lon: "xyz" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    expect(await geocodeAU({ suburb: "Nowhere" })).toBeNull();
  });
});
