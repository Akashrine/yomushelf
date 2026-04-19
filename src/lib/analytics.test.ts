import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackEvent } from "./analytics";

describe("trackEvent", () => {
  beforeEach(() => {
    delete (window as { gtag?: unknown }).gtag;
  });

  it("calls window.gtag when available", () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;

    trackEvent("test_event", { foo: "bar" });

    expect(gtag).toHaveBeenCalledWith("event", "test_event", { foo: "bar" });
  });

  it("is a noop when gtag is not loaded", () => {
    expect(() => trackEvent("test_event")).not.toThrow();
  });

  it("passes params as-is", () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;

    trackEvent("wrapped_card_viewed", { year: 2025, card_index: 3 });

    expect(gtag).toHaveBeenCalledWith("event", "wrapped_card_viewed", {
      year: 2025,
      card_index: 3,
    });
  });

  it("fires with no params when omitted", () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;

    trackEvent("profile_made_public");

    expect(gtag).toHaveBeenCalledWith("event", "profile_made_public", undefined);
  });
});
