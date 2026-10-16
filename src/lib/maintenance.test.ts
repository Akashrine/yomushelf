import { describe, it, expect } from "vitest";
import { maintenanceDecision } from "./maintenance";

const token = "a-long-bypass-token-0123";

describe("maintenanceDecision", () => {
  it("lets everything through when maintenance is off", () => {
    expect(maintenanceDecision({ enabled: undefined, token, cookie: undefined, param: null })).toBe("pass");
    expect(maintenanceDecision({ enabled: "0", token, cookie: undefined, param: null })).toBe("pass");
  });
  it("blocks everyone without the bypass", () => {
    expect(maintenanceDecision({ enabled: "1", token, cookie: undefined, param: null })).toBe("block");
    expect(maintenanceDecision({ enabled: "1", token, cookie: "wrong", param: "wrong" })).toBe("block");
  });
  it("grants then honours the bypass token", () => {
    expect(maintenanceDecision({ enabled: "1", token, cookie: undefined, param: token })).toBe("grant_bypass");
    expect(maintenanceDecision({ enabled: "1", token, cookie: token, param: null })).toBe("pass");
  });
  it("never accepts a missing or short token", () => {
    expect(maintenanceDecision({ enabled: "1", token: undefined, cookie: "undefined", param: "undefined" })).toBe("block");
    expect(maintenanceDecision({ enabled: "1", token: "short", cookie: "short", param: "short" })).toBe("block");
  });
});
