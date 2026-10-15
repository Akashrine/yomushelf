// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ error: null as { code: string } | null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
    from: () => ({ update: () => ({ eq: async () => ({ error: state.error }) }) }),
  }),
}));
import { upsertOnboardingSelection } from "./actions";
beforeEach(() => { state.error = null; });
it("does not complete onboarding when the profile update fails", async () => {
  state.error = { code: "42501" };
  expect((await upsertOnboardingSelection(new FormData())).success).toBe(false);
});
it("allows onboarding without selections after the profile is saved", async () => {
  expect(await upsertOnboardingSelection(new FormData())).toEqual({ success: true });
});
