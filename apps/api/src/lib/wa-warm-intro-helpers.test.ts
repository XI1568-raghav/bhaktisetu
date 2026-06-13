import { describe, it, expect } from "vitest";
import {
  buildWarmIntroShareUrl,
  renderWarmIntroBatch,
  renderWarmIntroMessage,
  WA_WARM_INTRO_SOURCE_TAG,
} from "./wa-warm-intro-helpers.js";

describe("wa-warm-intro-helpers", () => {
  describe("buildWarmIntroShareUrl", () => {
    it("appends utm tags to the default base url", () => {
      const url = new URL(buildWarmIntroShareUrl());
      expect(url.origin + url.pathname).toBe("https://darshya.online/");
      expect(url.searchParams.get("utm_source")).toBe("wa-warm-intro");
      expect(url.searchParams.get("utm_medium")).toBe("whatsapp");
      expect(url.searchParams.get("utm_campaign")).toBe("r-q1-cs-006");
    });

    it("honors a custom base url for staging", () => {
      const url = new URL(buildWarmIntroShareUrl("https://staging.darshya.online"));
      expect(url.host).toBe("staging.darshya.online");
      expect(url.searchParams.get("utm_source")).toBe("wa-warm-intro");
    });

    it("exports the source tag constant the rest of the app joins on", () => {
      expect(WA_WARM_INTRO_SOURCE_TAG).toBe("wa-warm-intro");
    });
  });

  describe("renderWarmIntroMessage", () => {
    it("renders the friends-family template with namaste + name", () => {
      const msg = renderWarmIntroMessage({ name: "Anjali", audience: "friends-family" });
      expect(msg.startsWith("Namaste Anjali 🙏")).toBe(true);
      expect(msg).toContain("close friends");
      expect(msg).toContain("https://darshya.online/?utm_source=wa-warm-intro");
      // Both templates must end on the share-url CTA line, not a stray newline
      expect(msg.endsWith("\n")).toBe(false);
    });

    it("renders the professional template with Hi + name + founder-mode line", () => {
      const msg = renderWarmIntroMessage({ name: "Ravi", audience: "professional" });
      expect(msg.startsWith("Hi Ravi,")).toBe(true);
      expect(msg).toContain("founder-mode ask");
      expect(msg).toContain("https://darshya.online/?utm_source=wa-warm-intro");
    });

    it("trims whitespace from the contact name", () => {
      const msg = renderWarmIntroMessage({ name: "  Sita  ", audience: "friends-family" });
      expect(msg.startsWith("Namaste Sita 🙏")).toBe(true);
    });

    it("rejects empty name to prevent paste-mistakes during the blast", () => {
      expect(() =>
        renderWarmIntroMessage({ name: "   ", audience: "friends-family" }),
      ).toThrow(/contact.name is required/);
    });

    it("uses the custom base url when provided", () => {
      const msg = renderWarmIntroMessage(
        { name: "Test", audience: "professional" },
        { baseUrl: "https://staging.darshya.online" },
      );
      expect(msg).toContain("https://staging.darshya.online");
      expect(msg).not.toContain("https://darshya.online/?");
    });
  });

  describe("renderWarmIntroBatch", () => {
    it("renders one paste-ready message per contact, preserving order", () => {
      const out = renderWarmIntroBatch([
        { name: "Anjali", audience: "friends-family" },
        { name: "Ravi", audience: "professional" },
      ]);
      expect(out).toHaveLength(2);
      expect(out[0]?.name).toBe("Anjali");
      expect(out[0]?.message.startsWith("Namaste Anjali 🙏")).toBe(true);
      expect(out[1]?.name).toBe("Ravi");
      expect(out[1]?.message.startsWith("Hi Ravi,")).toBe(true);
    });

    it("returns an empty array for empty input", () => {
      expect(renderWarmIntroBatch([])).toEqual([]);
    });
  });
});
