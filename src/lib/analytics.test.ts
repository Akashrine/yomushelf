import { describe, expect, it } from "vitest";
import { BatchSchema, cleanPath, redactLinkTokens, sourceFrom, validateEvents } from "./analytics-catalogue";

describe("validateEvents", () => {
  it("keeps known events with their declared properties", () => {
    expect(validateEvents([{ name: "deck_swiped", props: { choice: "wish" } }])).toEqual([{ name: "deck_swiped", properties: { choice: "wish" } }]);
  });

  it("drops unknown events, unknown properties and wrong values", () => {
    expect(
      validateEvents([
        { name: "made_up", props: {} },
        { name: "deck_swiped", props: { choice: "wish", query: "naruto" } },
        { name: "deck_swiped", props: { choice: "love" } },
        { name: "toString", props: {} },
      ])
    ).toEqual([]);
  });
});

describe("BatchSchema", () => {
  it("refuses more than 10 events at once", () => {
    const events = Array.from({ length: 11 }, () => ({ name: "deck_opened", props: {} }));
    expect(BatchSchema.safeParse({ events }).success).toBe(false);
  });

  it("refuses a source or a path that could carry free text", () => {
    expect(BatchSchema.safeParse({ events: [{ name: "deck_opened" }], context: { src: "Mon Fils Léo" } }).success).toBe(false);
    expect(BatchSchema.safeParse({ events: [{ name: "deck_opened" }], context: { path: "/x?q=secret" } }).success).toBe(false);
  });
});

describe("sourceFrom", () => {
  it("prefers utm_source, then the referrer's site", () => {
    expect(sourceFrom("?utm_source=TikTok", "https://www.instagram.com/", "www.yomushelf.com")).toBe("tiktok");
    expect(sourceFrom("", "https://l.instagram.com/?u=x", "www.yomushelf.com")).toBe("instagram");
    expect(sourceFrom("", "https://www.google.fr/", "www.yomushelf.com")).toBe("google");
    expect(sourceFrom("", "https://forum.example.org/t/1", "www.yomushelf.com")).toBe("forum.example.org");
  });

  it("counts the site itself and no referrer as direct", () => {
    expect(sourceFrom("", "", "www.yomushelf.com")).toBe("direct");
    expect(sourceFrom("", "https://yomushelf.com/login", "www.yomushelf.com")).toBe("direct");
  });
});

describe("cleanPath", () => {
  it("never keeps a link token (consent, family list)", () => {
    const t = "cQQLaF6Qcxdpn0123456789abcdefghijklmnopqrst";
    expect(cleanPath(`/liste/${t}`)).toBe("/liste/jeton");
    expect(cleanPath(`/accord/${t}`)).toBe("/accord/jeton");
    expect(redactLinkTokens(`https://www.yomushelf.com/famille/${t}?arreter=1`)).toBe("https://www.yomushelf.com/famille/jeton?arreter=1");
    expect(cleanPath("/bibliotheque")).toBe("/bibliotheque");
  });
  it("removes series ids", () => {
    expect(cleanPath("/bibliotheque/021acb54-f7e7-4f75-9618-3716f1b03eb3")).toBe("/bibliotheque/id");
  });
});

describe("family list events", () => {
  const ev = (name: string, props: Record<string, unknown> = {}) => validateEvents([{ name, props }]);
  it("keeps the declared properties only", () => {
    expect(ev("family_list_created", { by: "parent" })).toHaveLength(1);
    expect(ev("family_list_stopped", { by: "reader" })).toHaveLength(1);
    expect(ev("family_list_offered")).toHaveLength(1);
  });
  it("refuses a link, a name or an unknown actor", () => {
    expect(ev("family_list_created", { by: "grandma" })).toHaveLength(0);
    expect(ev("family_list_viewed", { token: "x".repeat(43) })).toHaveLength(0);
    expect(ev("family_list_offered", { item: "Naruto" })).toHaveLength(0);
  });
});
