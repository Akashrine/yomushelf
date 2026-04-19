import { describe, it, expect } from "vitest";
import type { WrappedData } from "@/app/wrapped/[year]/actions";

// Mirrors the empty-state condition in WrappedCarousel
function shouldShowEmptyState(
  result: { success: true; data: WrappedData } | { success: false; error: string }
): boolean {
  if (!result.success) return true;
  return result.data.total_volumes_added < 10;
}

const BASE_DATA: WrappedData = {
  year: 2025,
  total_volumes_added: 10,
  total_budget_spent: 150,
  delta_vs_previous_year_pct: null,
  top_3_series: [],
  top_genre: "Shonen",
};

describe("wrapped empty state condition", () => {
  it("shows empty state when result is an error", () => {
    expect(shouldShowEmptyState({ success: false, error: "no data" })).toBe(true);
  });

  it("shows empty state when total_volumes_added < 10", () => {
    expect(
      shouldShowEmptyState({ success: true, data: { ...BASE_DATA, total_volumes_added: 9 } })
    ).toBe(true);
  });

  it("shows empty state at 0 volumes", () => {
    expect(
      shouldShowEmptyState({ success: true, data: { ...BASE_DATA, total_volumes_added: 0 } })
    ).toBe(true);
  });

  it("shows carousel at exactly 10 volumes", () => {
    expect(
      shouldShowEmptyState({ success: true, data: { ...BASE_DATA, total_volumes_added: 10 } })
    ).toBe(false);
  });

  it("shows carousel above 10 volumes", () => {
    expect(
      shouldShowEmptyState({ success: true, data: { ...BASE_DATA, total_volumes_added: 42 } })
    ).toBe(false);
  });
});
